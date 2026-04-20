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
 *  4. Collapse repeated letters > 2 (e.g. "kiillll" → "kill")
 *  5. Trim & collapse whitespace
 */
export function normalizeText(input: string): string {
  let s = input.toLowerCase();

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
// Each entry is normalized through the same pipeline before matching.
const BANNED_TERMS: string[] = [

  // ── Self-harm / suicide (explicit) ────────────────────────────────────────
  "self harm", "selfharm",
  "suicide", "suicidal", "end my life", "end your life",
  "end their life", "take your own life", "take my own life",
  "kill yourself", "kill myself", "kys",
  "want to die", "want to be dead",
  "cut yourself", "cut myself", "cutting yourself", "cutting myself",
  "slit wrist", "slit your wrist", "slit my wrist", "wrist cutting",
  "starvation dare", "starve yourself", "purge yourself",
  "binge and purge",
  "overdose", "od yourself", "od on",
  "choke yourself", "choke myself", "choking challenge",
  "blackout challenge", "pass out challenge", "faint challenge",
  "skull breaker", "fire challenge", "tide pod", "bleach challenge",
  "drink bleach", "drink poison", "swallow bleach",
  "hang yourself", "hang myself", "hanging yourself", "hanging dare",
  "noose dare", "noose yourself",
  "drown yourself", "drown myself", "drowning dare",
  "suffocate yourself", "suffocate myself",
  "stop breathing", "hold breath until you pass out",

  // ── Jumping from height / lethal falls ────────────────────────────────────
  // These are the phrases the original filter missed — "jump off X" with any
  // dangerous structure is treated as a hard block.
  "jump off a bridge", "jump off the bridge", "jump off bridge",
  "jump off a cliff", "jump off the cliff", "jump off cliff",
  "jump off a building", "jump off the building", "jump off building",
  "jump off a roof", "jump off the roof",
  "jump off a balcony", "jump off the balcony", "jump off balcony",
  "jump off a ledge", "jump off the ledge", "jump off ledge",
  "jump off a skyscraper", "jump off a tower", "jump off a parking",
  "jump off an overpass", "jump off overpass",
  "jump off a highway", "jump off a freeway",
  "jump from a bridge", "jump from bridge", "jump from a cliff",
  "jump from a building", "jump from a roof", "jump from a balcony",
  "jump from a ledge", "jump from height",
  "leap off a bridge", "leap off a cliff", "leap off a building",
  "leap off a roof", "leap off a balcony", "leap off a ledge",
  "leap off bridge", "leap off cliff", "leap off building",
  "leap from a bridge", "leap from a cliff", "leap from a building",
  "throw yourself off", "throw yourself from",
  "fall off a bridge", "fall off a cliff", "fall from a building",
  "fall from height",
  "building jump", "bridge jump", "cliff jump into",
  "roof jump", "rooftop jump",

  // ── Walk/run into traffic / in front of vehicles ──────────────────────────
  "walk into traffic", "walk in front of a car", "walk in front of traffic",
  "run into traffic", "run in front of a car", "run in front of a truck",
  "step in front of a train", "step in front of a car", "step in front of traffic",
  "jump in front of a train", "jump in front of a car", "jump in front of traffic",
  "jump in front of a bus", "jump in front of a truck",
  "lie in traffic", "lay in traffic", "play in traffic",
  "stand in traffic", "stand in the middle of traffic",

  // ── Physically dangerous / potentially lethal stunts ──────────────────────
  "train surfing", "train hopping dare", "railway dare",
  "electrocute", "electrocution", "electric shock yourself",
  "electric fence challenge", "touch a live wire",
  "set yourself on fire", "light yourself on fire", "light myself on fire",
  "set yourself alight", "human torch",
  "extreme stunt without safety",
  "ghost riding",
  "high speed crash dare",

  // ── Bodily injury to self ─────────────────────────────────────────────────
  "burn yourself", "burn myself",
  "break your own", "break my own",
  "injure yourself", "hurt yourself", "hurt myself",
  "cause yourself pain", "cause yourself harm",
  "bruise yourself", "bruise myself",

  // ── Illegal activity ──────────────────────────────────────────────────────
  "shoplift", "shoplifting",
  "steal from", "steal a car", "steal money",
  "vandalize", "vandalism", "graffiti on",
  "break in", "breaking in", "break into",
  "trespass", "trespassing",
  "drug deal", "sell drugs", "buy drugs",
  "meth", "heroin", "fentanyl", "cocaine", "crack cocaine",
  "smoke crack", "shoot up drugs", "inject drugs",
  "make a bomb", "build a bomb", "explosive device",
  "weapon smuggling", "gun smuggling",
  "identity theft", "credit card fraud", "wire fraud",
  "hotwire a car", "steal a vehicle",

  // ── Violence toward others ─────────────────────────────────────────────────
  "punch someone", "punch a stranger", "hit someone", "hit a stranger",
  "attack a", "assault a",
  "kill a", "murder",
  "stab someone", "stab a",
  "shoot someone", "shoot at",
  "hurt an animal", "harm an animal", "kick a dog", "kick a cat",
  "animal abuse", "animal cruelty",
  "fight a stranger", "jump someone",
  "beat someone up",

  // ── Sexual / explicit content ──────────────────────────────────────────────
  "nude", "nudes", "naked",
  "strip naked", "take off all clothes",
  "show genitals", "expose yourself",
  "flash", "flashing",
  "masturbat",
  "sex act", "sexual act",
  "onlyfans dare", "nsfw dare",
  "send nudes",

  // ── Minors / exploitation ─────────────────────────────────────────────────
  "involving a child", "involve a minor", "include a child",
  "kids do this", "children do this",
  "school bathroom dare", "locker room dare",
  "underage",

  // ── Hate speech / slurs ───────────────────────────────────────────────────
  "racist", "racism",
  "white supremac", "white power", "neo nazi",
  "heil hitler",
  "ethnic cleansing", "genocide",
  "hate crime", "hate speech",
  // Slur stems — normalization catches leet/obfuscated variants
  "nigge", "nigga", "nigg",
  "chink", "gook", "spick", "spic",
  "kike", "hymie", "wetback", "beaner",
  "coon ", "porch monkey",
  "raghead", "towelhead",
  "faggot", "fag dare",
  "tranny slur",
  "retard",
  "mongoloid",
  "cunt", "whore dare", "slut shaming",

  // ── Harassment / threats / doxxing ────────────────────────────────────────
  "stalk", "stalking dare",
  "dox", "doxx", "leak personal info", "leak address", "leak phone",
  "send threats", "threaten someone",
  "swat", "swatting",
  "humiliate a specific person", "target a specific person",
  "name and shame",

  // ── Extremist content ─────────────────────────────────────────────────────
  "race war", "great replacement",
  "14 words", "88 heil",

  // ── Degrading / abusive challenges ────────────────────────────────────────
  "act like a slave", "cotton picking",
  "beg like a dog for me",
];

// ─── SOFT FLAG — Borderline / risky terms ────────────────────────────────────
// These get a confirmation warning but are not outright blocked.
const FLAGGED_TERMS: string[] = [
  // Mild physical risk (non-lethal)
  "climb on roof",
  "speed dare", "drive fast", "race car",
  "cold water", "ice bath", "ice bucket",
  "hot food challenge", "spicy challenge",
  "drink raw", "eat raw",

  // Social awkwardness / embarrassment
  "prank", "embarrass", "humiliat",
  "public meltdown", "pretend to cry",
  "beg in public", "beg for money",
  "fool someone", "trick someone",

  // Mild language
  "stupid", "idiot", "moron", "dumb",
  "shut up", "loser",

  // Borderline / gray area
  "sneak into", "sneak in",
  "skip school", "ditch class",
  "lie to", "deceive",
  "gross out", "disgust",
];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function containsTerm(normalizedText: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
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
