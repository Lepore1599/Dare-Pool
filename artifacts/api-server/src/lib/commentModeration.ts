/**
 * Comment moderation
 *
 * Strategy:
 *  - Hard block: slurs, explicit hate, severe threats, targeted harassment
 *  - Soft flag: excessive profanity where the comment has little else
 *  - Allow: mild profanity in casual reactions ("this was fucking crazy", "badass")
 *
 * Returns { ok: true } when the comment is fine,
 *         { ok: false, soft: false, message: "..." } when it should be rejected.
 */

// ─── Normalise helpers ────────────────────────────────────────────────────────

function normalise(raw: string): string {
  return raw
    .toLowerCase()
    // basic leet-speak
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    // collapse repeated letters (e.g. "fffffuck" → "fuck")
    .replace(/(.)\1{2,}/g, "$1$1")
    // strip punctuation noise
    .replace(/[^a-z0-9\s']/g, " ")
    // collapse spaces
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Word lists ───────────────────────────────────────────────────────────────

/**
 * HARD BLOCK — slurs, extreme hate, severe threats.
 * Partial-word matches (e.g. "ni**er" inside another word are still caught).
 */
const HARD_BLOCK_TERMS: RegExp[] = [
  // racial/ethnic slurs (written out to enable matching after normalisation)
  /\bn[ie]gg[ae]r/,
  /\bn[ie]gg[ae]/,
  /\bchink\b/,
  /\bspick?\b/,
  /\bk[y]ke\b/,
  /\bcoon\b/,
  /\bgook\b/,
  /\bwetback/,
  /\bbeaner/,
  /\btowelhead/,
  /\bsandnigg/,
  /\bjigaboo/,
  /\bporch.?monk/,
  // gender/sexuality slurs
  /\bf[a4]gg[o0]t/,
  /\bf[a4]g\b/,
  /\bdyke\b/,
  /\btrans(gender)?.?(freak|filth)/,
  // severe threats
  /\bi.?ll.?(kill|murder|rape|stab|shoot|end).?you/,
  /\byou.?(should|gonna|will).?(die|hang|kys|kill yourself)/,
  /\bkys\b/,
  /\bkill your?self/,
  // explicit sexual harassment
  /\bsend.?nudes/,
  /\bi.?want.?to.?(rape|assault)/,
];

/**
 * HARASSMENT PATTERNS — targeted insults, bullying directed at a person.
 * Match these when the comment is directed at someone.
 */
const HARASSMENT_PATTERNS: RegExp[] = [
  /\byou(r|'?re)?.{0,20}(piece of (shit|crap)|fucking (idiot|moron|stupid|dumb|worthless|loser|trash|garbage))/,
  /\b(shut (the fuck|tf) up).{0,20}(you|ur|your)/,
  /\bgo (fuck|kill|hang).?your?self/,
  /\byou.{0,10}(are|r).{0,10}(worthless|pathetic|disgusting|subhuman|cancer)/,
  /\bno(body|one).?likes?.?you/,
  /\byou.{0,10}(belong|should be).{0,10}(dead|in hell|deleted)/,
];

/**
 * PROFANITY TERMS — these are mild swear words we count but don't hard-block.
 * If a comment is MOSTLY these with little other content, we soft-reject.
 */
const PROFANITY_TERMS: RegExp[] = [
  /\bfuck(ing|er|ers|ed|s)?\b/,
  /\bshit(ty|s|ter)?\b/,
  /\bbitch(es|y)?\b/,
  /\bass(hole|holes)?\b/,
  /\bdamn\b/,
  /\bcrap\b/,
  /\bpiss(ed)?\b/,
  /\bcock(s|sucker)?\b/,
  /\bdick(s|head)?\b/,
  /\bcunt\b/,
  /\bwhore\b/,
  /\bslut\b/,
  /\bpussy\b/,
  /\bbastard\b/,
  /\bwtf\b/,
  /\bstfu\b/,
];

// ─── Moderation function ──────────────────────────────────────────────────────

export interface ModerationResult {
  ok: boolean;
  message?: string;
}

export function moderateComment(rawContent: string): ModerationResult {
  const norm = normalise(rawContent);
  const words = norm.split(/\s+/);
  const wordCount = words.length;

  // 1. Hard block: slurs and extreme hate
  for (const pattern of HARD_BLOCK_TERMS) {
    if (pattern.test(norm)) {
      return { ok: false, message: "This comment violates community guidelines and cannot be posted." };
    }
  }

  // 2. Harassment patterns
  for (const pattern of HARASSMENT_PATTERNS) {
    if (pattern.test(norm)) {
      return { ok: false, message: "This comment violates community guidelines and cannot be posted." };
    }
  }

  // 3. Excessive profanity check
  // Count how many profanity-term tokens appear
  let profanityHits = 0;
  for (const pattern of PROFANITY_TERMS) {
    const matches = norm.match(new RegExp(pattern.source, "g"));
    if (matches) profanityHits += matches.length;
  }

  if (wordCount > 0) {
    const profanityRatio = profanityHits / wordCount;

    // More than half the words are profanity AND the comment is short (likely just curse spam)
    if (profanityRatio > 0.5 && wordCount <= 8) {
      return { ok: false, message: "This comment may be too aggressive or inappropriate. Please revise it." };
    }

    // 4 or more profanity hits in a very short comment (≤6 words) — excessive
    if (profanityHits >= 4 && wordCount <= 6) {
      return { ok: false, message: "This comment may be too aggressive or inappropriate. Please revise it." };
    }
  }

  return { ok: true };
}
