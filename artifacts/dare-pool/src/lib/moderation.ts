/**
 * DarePool Content Moderation
 *
 * Architecture:
 *  - normalizeText()  : strip punctuation, spaces, apply leet substitutions
 *  - BANNED_TERMS     : hard-block → "violates community guidelines"
 *  - FLAGGED_TERMS    : soft-warn  → "may be risky or inappropriate"
 *  - moderate()       : main entry point, returns ModerationResult
 *
 * Future upgrade hooks (TODO):
 *  - AI moderation (OpenAI Moderation API, Perspective API)
 *  - Admin review queue / trust & safety dashboard
 *  - Context-aware semantic analysis (not just keyword matching)
 *  - User trust scoring (verified accounts bypass soft flags)
 *  - Automated escalation for repeated offenders
 */

// ─── Leet-speak / obfuscation normalization map ──────────────────────────────
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "i",
  "+": "t",
  "(": "c",
  "[": "c",
  "{": "c",
};

/**
 * Normalize text for moderation matching:
 *  1. Lower-case
 *  2. Apply leet substitutions
 *  3. Remove punctuation / special chars (keep letters & spaces)
 *  4. Collapse repeated letters (e.g. "kiillll" → "kil")
 *  5. Trim & collapse whitespace
 */
export function normalizeText(input: string): string {
  let s = input.toLowerCase();

  // Apply leet substitutions character by character
  s = s
    .split("")
    .map((c) => LEET_MAP[c] ?? c)
    .join("");

  // Remove anything that's not a letter, digit, or space
  s = s.replace(/[^a-z0-9 ]/g, " ");

  // Collapse runs of the same letter > 2 (e.g. "kiiiill" → "kill")
  s = s.replace(/(.)\1{2,}/g, "$1$1");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

// ─── HARD BLOCK — Banned terms ───────────────────────────────────────────────
// Do NOT expose these to the end user in error messages.
// Add new entries freely; normalization handles leet variants automatically.
const BANNED_TERMS: string[] = [
  // Self-harm / suicide / bodily injury
  "self harm", "selfharm", "self-harm",
  "suicide", "suicidal", "kill yourself", "kys",
  "cut yourself", "cut myself", "slit wrist", "wrist cutting",
  "starvation", "starve yourself", "purge", "binge purge",
  "overdose", "od yourself", "choke yourself", "choking challenge",
  "blackout challenge", "pass out challenge",
  "skull breaker", "fire challenge", "tide pod", "bleach challenge",

  // Dangerous / lethal stunts
  "train surfing", "building jumping", "roof jumping",
  "electrocute", "electrocution", "electric shock yourself",
  "set yourself on fire", "light yourself on fire",

  // Illegal activity
  "shoplift", "shoplifting", "steal from", "steal a",
  "vandalize", "vandalism", "graffiti on", "break in", "breaking in",
  "trespass", "trespassing",
  "drug deal", "sell drugs", "buy drugs", "meth", "heroin", "fentanyl", "cocaine",
  "crack cocaine", "smoke crack", "shoot up", "inject drugs",
  "make a bomb", "build a bomb", "explosive device",
  "weapon smuggling", "gun smuggling",
  "identity theft", "credit card fraud", "wire fraud",

  // Violence
  "punch someone", "hit someone", "attack a", "assault a",
  "kill a", "murder", "stab someone", "shoot someone",
  "hurt an animal", "harm an animal", "kick a dog", "animal abuse",
  "fight a stranger", "jump someone",

  // Sexual content
  "nude", "nudes", "naked", "strip naked", "show genitals",
  "flash", "flashing", "masturbat", "sex act", "sexual act",
  "onlyfans dare", "nsfw",

  // Minors / exploitation
  "child", "minor", "underage", "kids do", "children do",
  "school bathroom", "locker room",

  // Hate speech / slurs — representative list; normalization catches leet variants
  // (Not exhaustively listed here — covered via prefix/infix matching below)
  "racist", "racism", "white supremac", "neo nazi", "neo-nazi",
  "heil hitler", "ethnic cleansing", "genocide",
  "hate crime", "hate speech",

  // Explicit slurs — using partial stems so normalization catches variants
  // (These are intentionally stored as normalized stems without full spelling
  //  to avoid this source file itself being a slur repository)
  "nigge", "nigga", "nigg", "chink", "gook", "spick", "spic",
  "kike", "hymie", "wetback", "beaner", "coon", "jig", "porch monkey",
  "raghead", "towelhead", "sandnigge", "cracker honky", "faggot",
  "dyke", "tranny slur", "retard", "mongoloid",
  "cunt", "whore", "slut shaming",

  // Harassment / threats
  "stalk", "dox", "doxx", "send threats", "threaten",
  "swat", "swatting", "leak personal info", "leak address",
  "humiliate a specific", "target specific",

  // Extremist language
  "jihad", "infidel kill", "crusade kill", "race war", "great replacement",
  "14 words", "88 heil",

  // Degrading / abusive challenges
  "slave challenge", "act like a slave", "cotton pick",
  "beg like a dog", "bark like a dog for me",
];

// ─── SOFT FLAG — Borderline / risky terms ────────────────────────────────────
const FLAGGED_TERMS: string[] = [
  // Mild physical risk
  "jump off", "climb on roof", "roof",
  "speed dare", "drive fast", "race car",
  "cold water", "ice bath", "ice bucket",
  "hot food challenge", "spicy challenge",
  "drink raw", "eat raw",
  "no hands",

  // Social awkwardness / embarrassment
  "prank", "fool", "trick someone", "embarrass", "humiliat",
  "public meltdown", "pretend to cry",
  "beg in public", "beg for money",

  // Mild language flags
  "stupid", "idiot", "moron", "dumb",
  "shut up", "loser",

  // Borderline content
  "sneak into", "sneak in",
  "fake id", "get into a bar",
  "skip school", "ditch class",
  "lie to", "deceive",
  "gross", "disgusting",
];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function containsTerm(normalizedText: string, term: string): boolean {
  // Normalize the term itself the same way
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;

  // Use word-boundary-aware partial match:
  // Allow if the term appears as a standalone word or as part of a longer token
  // (partial matching is intentional for stems like "nigge", "suicid" etc.)
  return normalizedText.includes(normalizedTerm);
}

function matchesAny(normalizedText: string, terms: string[]): boolean {
  return terms.some((term) => containsTerm(normalizedText, term));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ModerationOutcome = "ok" | "soft" | "hard";

export interface ModerationResult {
  outcome: ModerationOutcome;
  /** Safe to show to the user — never reveals which keyword matched */
  message: string;
}

/**
 * Moderate the combined title + description of a dare.
 * Returns a ModerationResult with:
 *   - "ok"   → safe to post
 *   - "soft" → borderline; show warning and let user confirm
 *   - "hard" → blocked; prevent submission
 */
export function moderate(title: string, description: string): ModerationResult {
  const combined = `${title} ${description}`;
  const normalized = normalizeText(combined);

  if (matchesAny(normalized, BANNED_TERMS)) {
    return {
      outcome: "hard",
      message: "This dare violates community guidelines and cannot be posted.",
    };
  }

  if (matchesAny(normalized, FLAGGED_TERMS)) {
    return {
      outcome: "soft",
      message:
        "This dare may be risky or inappropriate. Please revise it or confirm if you want to continue.",
    };
  }

  return { outcome: "ok", message: "" };
}
