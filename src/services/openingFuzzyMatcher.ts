/**
 * openingFuzzyMatcher
 * -------------------
 * Fuzzy-matches a user-typed opening name against the Lichess
 * `openings-lichess.json` DB + the NAME_ALIASES map.
 *
 * Why a separate fuzzy layer when `resolveOpeningEntry` already
 * exists: `resolveOpeningEntry` does exact / prefix / substring /
 * token-set match, then returns null. No scoring, no nearby
 * candidates. Off-canonical inputs like:
 *
 *   "Philidor Defence"  (British 'ce' vs DB's American 'se')
 *   "Najdorff"          (typo, one extra letter)
 *   "Caro Cann"         (missing K)
 *   "kid"               (acronym not in alias map yet)
 *
 * all return null today, kick the surface router into the brain
 * path, and the brain bounces to /coach/session/walkthrough (the
 * bug David caught on 2026-05-19).
 *
 * This matcher widens the net:
 *   1. Tries `resolveOpeningEntry` first. Hit → autoAccept.
 *   2. If miss, normalizes the input (including British→American
 *      spelling rewrites) and re-tries `resolveOpeningEntry`.
 *      Hit → autoAccept (the British "Defence" case lands here).
 *   3. If still miss, scores every teachable opening in the DB by
 *      similarity (Damerau-Levenshtein over normalized names) and
 *      returns the top-N candidates plus an autoAccept flag.
 *
 * David's wide-berth rule (2026-05-19, verbatim):
 *   *"give it a wide birth and then have coach ask and confirm or
 *   have it give several close options in the picker. asking a
 *   question develops picker answers."*
 *
 * So the cutoffs are tight: only autoAccept when the top hit is
 * dominant AND the runner-up is clearly behind. Otherwise return
 * candidates and let the brain compose a "did you mean…" question
 * with `[CHOICES:]` picker chips.
 */
import openingsData from '../data/openings-lichess.json';
import { resolveOpeningEntry, isTeachable } from './openingDetectionService';

interface OpeningEntry {
  name: string;
  eco: string;
  pgn: string;
}

export interface FuzzyCandidate {
  /** Canonical DB name (the string surface routing should use). */
  canonicalName: string;
  /** ECO code for the matched entry. */
  eco: string;
  /** [0, 1] — 1.0 = exact / resolveOpeningEntry hit. */
  score: number;
  /** Where the match came from — for audits + UX copy. */
  source: 'resolveOpeningEntry' | 'british-normalized' | 'fuzzy-distance';
}

export interface FuzzyMatchResult {
  /** Top-N candidates, score descending. Empty when nothing scored
   *  above the floor (CANDIDATE_FLOOR). */
  candidates: FuzzyCandidate[];
  /** True when the top candidate is dominant enough to skip the
   *  "did you mean…" round-trip. False = the brain should ask. */
  autoAccept: boolean;
  /** Input the matcher was called with, post-trim. Surface uses
   *  this in audit summaries. */
  query: string;
}

/** Above this score → match is strong enough to consider. Below this →
 *  drop the candidate from the surfaced list entirely. */
const CANDIDATE_FLOOR = 0.55;

/** Auto-accept gate: top hit ≥ AUTO_ACCEPT AND gap to runner-up
 *  ≥ AUTO_ACCEPT_GAP. Both must hold. Tuned conservatively per
 *  David's wide-berth directive — when in doubt, ASK. */
const AUTO_ACCEPT = 0.92;
const AUTO_ACCEPT_GAP = 0.15;

/** Cap on surfaced candidates so the picker doesn't overflow. */
const MAX_CANDIDATES = 4;

/** British → American spelling rewrites that show up in opening
 *  names (DB stores American). Lower-cased, applied to normalized
 *  query before re-trying `resolveOpeningEntry`. */
const BRITISH_TO_AMERICAN: Array<[RegExp, string]> = [
  [/defence\b/g, 'defense'],
  [/centre\b/g, 'center'],
  [/manoeuvre\b/g, 'maneuver'],
  [/colour\b/g, 'color'],
  [/honour\b/g, 'honor'],
];

function americanize(s: string): string {
  let out = s.toLowerCase();
  for (const [re, repl] of BRITISH_TO_AMERICAN) out = out.replace(re, repl);
  return out;
}

/** Strip natural-language intent filler and side qualifiers so a bare opening
 *  name / acronym survives to the alias resolver. "Teach me the KIA with white
 *  pieces" and "KIA with white pieces" both need to reduce to "KIA" — the
 *  NAME_ALIASES lookup is a whole-string exact match, so the trailing "with
 *  white pieces" was making "KIA" (King's Indian ATTACK) fail to resolve and
 *  the fuzzy scan then mis-grabbed "King's Indian" (the Defence). Fixes the
 *  2026-07-18 report: "coach can't teach the KIA with the white pieces."
 *  Returns the stripped string (may equal the input if nothing matched). */
function stripOpeningQualifiers(q: string): string {
  return q
    // leading intent verbs: "teach me the", "show me", "learn about", "let's play"
    .replace(
      /^(?:(?:can\s+you\s+|please\s+|i\s+want\s+to\s+|let'?s\s+|help\s+me\s+)?(?:teach|show|learn|study|practi[cs]e|play|cover|explain|go\s+over)(?:\s+me)?(?:\s+(?:about|how\s+to\s+play|the|a|an))*)\s+/i,
      '',
    )
    // trailing side qualifier: "with (the) white pieces", "as black", "for
    // white", "playing white", "from white's side" — keep the opening name.
    .replace(
      /\s+(?:with|as|for|playing|from|on)\s+(?:the\s+)?(?:white|black)(?:'s)?(?:\s+(?:pieces|side))?\.?$/i,
      '',
    )
    .replace(/^(?:the|a|an)\s+/i, '')
    .trim();
}

/** Normalize for distance comparison. Same shape as
 *  openingDetectionService.normalizeNameForMatch (case + diacritic +
 *  apostrophe + hyphen) PLUS British→American spelling rewrite. */
function normalize(s: string): string {
  return americanize(
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[‘’'`]s\b/g, '')
      .replace(/[‘’'`]/g, '')
      .replace(/-/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Damerau-Levenshtein distance (adjacent transpositions count as
 *  one). Slower than vanilla Levenshtein but catches "Najdorff" ↔
 *  "Najdorf" (insertion) and "Caro" ↔ "Crao" (transposition) at
 *  the same cost. */
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  // Two-row rolling buffer + a third row for the transposition step.
  let prev2 = new Array<number>(bl + 1).fill(0);
  let prev1 = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev1[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insert
        prev1[j] + 1,           // delete
        prev1[j - 1] + cost,    // substitute
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        curr[j] = Math.min(curr[j], prev2[j - 2] + 1); // transpose
      }
    }
    prev2 = prev1;
    prev1 = curr;
    curr = new Array<number>(bl + 1);
  }
  return prev1[bl];
}

/** Distance → similarity in [0, 1]. */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const d = damerauLevenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - d / maxLen;
}

/** Tokenize a normalized string into words ≥ 3 chars (drops "of",
 *  "to", "the", etc. that bloat the token list without
 *  discriminating). */
function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter((t) => t.length >= 3);
}

/** Token-level scoring. For each query token, find the best
 *  per-token similarity against any candidate token, then take the
 *  mean. This is what makes "Najdorff" (one short typo'd token)
 *  score high against "Sicilian Defense: Najdorf Variation" (4
 *  tokens, one of which is a near-match) — flat string-level
 *  Damerau-Levenshtein over-penalizes the length difference. */
function tokenScore(qTokens: string[], cTokens: string[]): number {
  if (qTokens.length === 0 || cTokens.length === 0) return 0;
  let sum = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const ct of cTokens) {
      const s = similarity(qt, ct);
      if (s > best) best = s;
      if (best === 1) break;
    }
    sum += best;
  }
  return sum / qTokens.length;
}

/** Reverse token score: of CANDIDATE tokens, how many find a match
 *  in QUERY tokens? This is the precision side of the equation. The
 *  forward `tokenScore` measures recall (did the query find what it
 *  was looking for in this candidate). Without this, candidates with
 *  many extra tokens score the same as focused matches:
 *
 *    query = "danish gambit"
 *    A: "Danish Gambit"                              recall=1.0 precision=1.0
 *    B: "Sicilian: Smith-Morra Gambit, Danish Var."  recall=1.0 precision=~0.3
 *
 *  F1 combines them so A beats B. Audit 2026-05-19 (Bug C). */
function scoreCandidate(qNorm: string, cNorm: string): number {
  const qTokens = tokenize(qNorm);
  const cTokens = tokenize(cNorm);
  const recall = tokenScore(qTokens, cTokens);
  const flat = similarity(qNorm, cNorm);
  // Single-token queries (typos like "Najdorff") have no precision
  // signal — a 1-token query against a multi-token candidate always
  // has low precision, which over-penalizes legitimate typo
  // surfacing. Fall back to the original recall+flat blend.
  if (qTokens.length <= 1) {
    return Math.max(recall, recall * 0.7 + flat * 0.3);
  }
  const precision = tokenScore(cTokens, qTokens);
  // F1: harmonic mean of precision + recall. Guards against
  // division-by-zero when both sides are 0 (no matches at all).
  const f1 = recall + precision > 0
    ? (2 * recall * precision) / (recall + precision)
    : 0;
  // Final score: F1-led blend. Flat similarity stays in the mix so
  // a tight whole-string match still gets credit; keeping `recall`
  // in the blend protects against F1 collapsing when the candidate
  // is legitimately long (e.g. matching the full canonical name of
  // a deep variation). Weights tuned to reproduce the live-audit
  // failure mode (Danish Gambit vs Sicilian Smith-Morra Danish Var)
  // and verify the bare parent now wins.
  return Math.max(f1, f1 * 0.6 + recall * 0.25 + flat * 0.15);
}

/** Pool of entries the fuzzy matcher considers. Was a stricter
 *  ply-count filter (≥ 8 plies OR has ":") that incorrectly hid the
 *  canonical bare parent of well-known short openings (Danish Gambit
 *  at 5 plies, King's Gambit, Vienna Game). Switched to the shared
 *  `isTeachable` decision from openingDetectionService — that one
 *  keeps any entry with DB sub-variations, regardless of its own
 *  ply count. Audit 2026-05-19 (Bug C). */
const TEACHABLE: OpeningEntry[] = (openingsData as OpeningEntry[]).filter(isTeachable);

/** Deduplicate candidates by canonical name (the DB has many entries
 *  with the same name at different depths). Keep the highest score. */
function dedupe(cands: FuzzyCandidate[]): FuzzyCandidate[] {
  const byName = new Map<string, FuzzyCandidate>();
  for (const c of cands) {
    const prev = byName.get(c.canonicalName);
    if (!prev || c.score > prev.score) byName.set(c.canonicalName, c);
  }
  return Array.from(byName.values()).sort((a, b) => b.score - a.score);
}

/** Matchup separators — "KIA vs Sicilian dragon", "London against the
 *  King's Indian", "Italian versus the Petroff". The user is naming TWO
 *  openings (what they play + what they face), not one; the whole-string
 *  fuzzy scan mangles it (the "KIA" token drowns under the opponent's
 *  name, surfacing four Sicilian Dragon rows and never the KIA — David
 *  2026-07-18). Split and match each side. */
const MATCHUP_SPLIT_RE = /\s+(?:vs\.?|versus|against)\s+/i;

/** Main entry point. */
export function fuzzyMatchOpening(rawQuery: string): FuzzyMatchResult {
  const query = rawQuery.trim();
  if (!query) {
    return { candidates: [], autoAccept: false, query: '' };
  }

  // Matchup ("X vs Y"): resolve BOTH sides and offer both as candidates —
  // the side the student PLAYS first (left of the separator), the side
  // they FACE second. Never auto-accept a matchup: it's inherently a
  // "which of these did you mean?" pick. Only fires when the whole string
  // doesn't resolve directly (so "Sicilian Defense" — no separator — is
  // untouched, and a rare opening literally containing "vs" still gets a
  // direct hit first via the tiers below).
  // "…against ME" IS NOT A MATCHUP. David 2026-08-08, from a live run: he typed
  // "Play the Vienna gambit against me", the left side resolved PERFECTLY
  // (resolveOpeningEntry, score 1.00), and he was told "I don't have an exact
  // match" and handed a picker with one option in it.
  //
  // The splitter fired on "against", took "me" as the opposing opening, and
  // matchups never auto-accept — correctly, because "Sicilian vs Alapin" really
  // is a which-did-you-mean. But an OPPONENT PRONOUN is the opposite: it names
  // who is playing, not a second opening, and "play X against me" is the most
  // natural way there is to ask for a game in X.
  const OPPONENT_PRONOUN = /^(?:me|us|myself|you|the\s+(?:coach|computer|engine|bot))$/i;
  const matchupSides = query.split(MATCHUP_SPLIT_RE);
  const facingAPerson = matchupSides.length === 2 && OPPONENT_PRONOUN.test(matchupSides[1].trim());
  if (facingAPerson && matchupSides[0].trim()) {
    // Match on the OPENING alone. Falling through with "against me" still
    // attached would leave the tiers scoring a string no opening is named
    // after, which is how a 1.00 direct hit turned into a one-option picker.
    const inner = fuzzyMatchOpening(matchupSides[0].trim());
    if (inner.candidates.length > 0) return { ...inner, query };
  }
  if (matchupSides.length === 2 && !facingAPerson && !resolveOpeningEntry(query)) {
    const [left, right] = matchupSides.map((s) => s.replace(/^the\s+/i, '').trim());
    const merged: FuzzyCandidate[] = [];
    for (const side of [left, right]) {
      if (!side) continue;
      // Recurse per side (single opening name → the normal tiers apply,
      // including alias resolution so "KIA" → King's Indian Attack).
      merged.push(...fuzzyMatchOpening(side).candidates);
    }
    const top = dedupe(merged).slice(0, MAX_CANDIDATES);
    if (top.length > 0) {
      return { candidates: top, autoAccept: false, query };
    }
    // Both sides blank → fall through to the whole-string tiers.
  }

  // Tier 1: existing resolver. Hits cover ≥99% of canonical inputs
  // and don't need fuzzy scoring at all. Try the query as-typed, then
  // with a leading article stripped — "the KIA" / "the Vienna" are
  // common, and an acronym alias ("kia") only matches the bare token.
  // Try as-typed, then with a leading article stripped, then with intent
  // filler + side qualifiers stripped ("KIA with white pieces" → "KIA"), so an
  // acronym alias that only matches the bare token still resolves.
  const stripped = stripOpeningQualifiers(query);
  const direct =
    resolveOpeningEntry(query) ??
    resolveOpeningEntry(query.replace(/^(?:the|a|an)\s+/i, '')) ??
    (stripped && stripped !== query ? resolveOpeningEntry(stripped) : null);
  if (direct) {
    return {
      candidates: [
        {
          canonicalName: direct.canonicalName,
          eco: direct.eco,
          score: 1,
          source: 'resolveOpeningEntry',
        },
      ],
      autoAccept: true,
      query,
    };
  }

  // Tier 2: British→American rewrite, then re-resolve. Catches
  // "Philidor Defence", "Caro-Kann Centre Counter", etc.
  const americanized = americanize(query);
  if (americanized !== query.toLowerCase()) {
    const second = resolveOpeningEntry(americanized);
    if (second) {
      return {
        candidates: [
          {
            canonicalName: second.canonicalName,
            eco: second.eco,
            score: 1,
            source: 'british-normalized',
          },
        ],
        autoAccept: true,
        query,
      };
    }
  }

  // Tier 3: full fuzzy distance scan over the teachable DB.
  const qNorm = normalize(query);
  if (!qNorm) {
    return { candidates: [], autoAccept: false, query };
  }
  const scored: FuzzyCandidate[] = [];
  for (const entry of TEACHABLE) {
    const cNorm = normalize(entry.name);
    const score = scoreCandidate(qNorm, cNorm);
    if (score >= CANDIDATE_FLOOR) {
      scored.push({
        canonicalName: entry.name,
        eco: entry.eco,
        score,
        source: 'fuzzy-distance',
      });
    }
  }
  const top = dedupe(scored).slice(0, MAX_CANDIDATES);
  if (top.length === 0) {
    return { candidates: [], autoAccept: false, query };
  }
  const dominant =
    top[0].score >= AUTO_ACCEPT &&
    (top.length === 1 || top[0].score - top[1].score >= AUTO_ACCEPT_GAP);
  return {
    candidates: top,
    autoAccept: dominant,
    query,
  };
}
