/**
 * Opening-name claim validator — the missing hallucination gate for invented
 * opening / variation NAMES (the "Saduleto line" class: the brain confidently
 * names a line that does not exist in the canonical Lichess DB).
 *
 * The existing runtime gates cover board-facts (boardClaimValidator), moves +
 * player-entities + numbers (claimValidator, on grounded turns), eval
 * (evalClaimValidator), tactic vocabulary (tacticClaimValidator) and arrows
 * (arrowClaimValidator). NONE of them catch a fabricated PROPER-NOUN opening
 * name — it isn't a board fact, a player, a number, or a tactic word.
 *
 * AUDIT-ONLY for now (David 2026-06-04 — full hallucination-gate sweep). A
 * precise ENFORCING version needs the conversation's opening context threaded
 * in, because real sub-variation names ("Exchange Variation", "Open
 * Defense") frequently don't resolve STANDALONE against the DB and would be
 * false-positives. This gate logs the unresolved named-opening phrases so
 * PostHog tells us the real invented-name rate, then we enforce with the
 * right precision. It NEVER mutates the answer.
 *
 * Detection: scan for "the <Proper Noun phrase> <Variation|Defense|Gambit|…>"
 * and try to resolve the phrase against `resolveOpeningEntry` (DB + aliases +
 * fuzzy). A phrase that fails to resolve AND whose leading word is not a known
 * chess descriptor (Open/Closed/Exchange/Main/… — the standalone-unresolvable
 * but REAL sub-variation words) is a candidate fabrication.
 */
import { resolveOpeningEntry } from './openingDetectionService';

/** The type-words that mark a phrase as a *named* opening claim. "Line" is
 *  deliberately excluded — "the main line", "the critical line", "the only
 *  line" are generic prose, not proper-noun opening names. */
const OPENING_TYPE_WORDS = '(?:Variation|Defense|Defence|Gambit|Attack|System|Opening|Countergambit|Counter-Gambit)';

/** "the <1-4 Capitalized words> <type word>" — the shape of a named-opening
 *  claim in coach prose. Capitalisation requirement keeps it off lowercase
 *  generic phrases ("the exchange of queens", "the attack on f7"). */
const NAMED_OPENING_RE = new RegExp(
  `\\bthe ([A-Z][A-Za-z'’-]+(?: [A-Z][A-Za-z'’-]+){0,3}) ${OPENING_TYPE_WORDS}\\b`,
  'g',
);

/** Leading descriptor words that legitimately prefix a sub-variation but
 *  don't resolve STANDALONE against the DB (so an unresolved one is NOT
 *  evidence of fabrication — it just lacks parent context). Lower-cased. */
const SUBVARIATION_DESCRIPTORS = new Set<string>([
  'open', 'closed', 'exchange', 'main', 'classical', 'modern', 'advance',
  'advanced', 'fianchetto', 'hyperaccelerated', 'accelerated', 'delayed',
  'improved', 'old', 'new', 'quiet', 'positional', 'tactical', 'sharp',
  'anti', 'normal', 'standard', 'sicilian', 'french', 'caro', 'slav',
  'indian', 'spanish', 'italian',
]);

export interface OpeningNameClaimViolation {
  /** The captured proper-noun phrase (without the type-word). */
  name: string;
  /** The full matched substring, e.g. "the Saduleto Variation". */
  match: string;
}

export interface OpeningNameValidationResult {
  /** Named-opening phrases that did NOT resolve in the DB and aren't a
   *  known standalone-unresolvable sub-variation descriptor. */
  violations: OpeningNameClaimViolation[];
  /** True when any named-opening phrase was found (resolved or not). */
  hasAnyNameClaim: boolean;
}

/** Scan `text` for named-opening claims and flag the ones that don't resolve
 *  in the canonical DB. Pure read-only — NEVER mutates. */
export function validateOpeningNameClaims(text: string): OpeningNameValidationResult {
  const violations: OpeningNameClaimViolation[] = [];
  let hasAnyNameClaim = false;

  // Strip tool markers so a name inside [[ACTION:…]]/[BOARD:…] isn't matched.
  const prose = text.replace(/\[\[[^\]]*\]\]|\[[^\]]*\]/g, ' ');

  let m: RegExpExecArray | null;
  NAMED_OPENING_RE.lastIndex = 0;
  while ((m = NAMED_OPENING_RE.exec(prose)) !== null) {
    hasAnyNameClaim = true;
    const name = m[1].trim();
    const full = m[0].trim();

    // A bare descriptor ("the Exchange Variation") legitimately needs parent
    // context to resolve — not evidence of fabrication. Skip when the WHOLE
    // captured phrase is a single descriptor word.
    const words = name.split(/\s+/);
    if (words.length === 1 && SUBVARIATION_DESCRIPTORS.has(words[0].toLowerCase())) {
      continue;
    }

    // Resolve the PROPER-NOUN phrase only — NOT the type-word. The type-word
    // ("Variation", "Gambit", …) appears in hundreds of DB entries and would
    // token-match broadly ("Saduleto Variation" → any "… Variation"), so
    // resolving the full phrase is a false-negative trap. resolveOpeningEntry
    // does alias + prefix + substring + token matching on the name, so a real
    // name ("Najdorf", "King's Indian") resolves; only a fabrication is null.
    let resolved = false;
    try {
      resolved = resolveOpeningEntry(name) !== null;
    } catch {
      resolved = false; // resolver fault → unresolved, but never throw
    }
    if (!resolved) {
      violations.push({ name, match: full });
    }
  }

  return { violations, hasAnyNameClaim };
}
