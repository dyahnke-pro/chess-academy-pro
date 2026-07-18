/**
 * voiceContainment — the "nothing ADDED" net for voiceFacts (Phase 0a of the
 * Danya review build; David 2026-07-18: "how do we get the llm to not say
 * what we want instead of other random things? … it had a tangent about what
 * a knight fork was").
 *
 * voiceFacts already gates INVENTED NUMBERS (`introducedNumbers`) and DROPPED
 * critical tokens (`mustPreserve`) — but a conceptual tangent (a knight-fork
 * definition, generic advice) adds no number and drops no token, so it passed
 * both. The only guard was the prompt's "add NOTHING" line — begging, not a
 * gate. This module is the symmetric third net: pure functions, zero LLM
 * calls, fallback = the computed prose (never a regen).
 *
 * PRECISION OVER RECALL: a false trip downgrades a good warm phrasing to the
 * raw facts — a quality loss on every fire — so the checks target the
 * HIGH-SIGNAL addition classes only:
 *   • squares/SAN tokens the facts never mention (the model moved the
 *     conversation to a part of the board it wasn't given),
 *   • tactical/strategic CONCEPT terms absent from the facts (the fork
 *     tangent), with inflection folding (fork/forks/forking),
 *   • runaway sentence count (padding tangents with no chess vocab at all).
 * Piece words alone ("the knight…") are deliberately NOT flagged — phrasing
 * "Nf3" as "the knight comes to f3" is legitimate voicing, and the square
 * check already anchors it to the given facts.
 */

/** Closed lexicon of tactical/strategic concept terms the phrasing model may
 *  only use when the FACTS use them. Base forms; `foldInflections` maps
 *  plurals/gerunds down. Sourced from the tactics detector's types + the
 *  misconception taxonomy's vocabulary + the classic-tactics canon. */
const CONCEPT_TERMS: readonly string[] = [
  'fork', 'pin', 'skewer', 'zwischenzug', 'zugzwang', 'outpost', 'battery',
  'windmill', 'deflection', 'decoy', 'overload', 'interference', 'clearance',
  'smothered', 'stalemate', 'perpetual', 'fianchetto', 'prophylaxis',
  'triangulation', 'opposition', 'underpromotion', 'gambit', 'trap',
  // multi-word patterns checked as phrases:
  'discovered attack', 'discovered check', 'double check', 'x-ray',
  'back rank', 'greek gift', 'en passant', 'passed pawn', 'isolated pawn',
  'doubled pawn', 'hanging piece',
];

/** All board squares mentioned in a string — standalone ("e4") or embedded in
 *  SAN ("Nf3", "exd5", "Qxd5+"). Lower-cased set. */
export function squaresIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/[a-h][1-8]/gi)) out.add(m[0].toLowerCase());
  return out;
}

/** Concept terms (base-folded) present in a string. */
export function conceptsIn(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of CONCEPT_TERMS) {
    if (term.includes(' ') || term.includes('-')) {
      // Phrase terms: normalize hyphens/spaces on both sides.
      const norm = term.replace(/[- ]/g, '[- ]?');
      if (new RegExp(`\\b${norm}`, 'i').test(lower)) found.add(term);
    } else {
      // Single words: match any inflection of the base.
      const re = new RegExp(`\\b${term}(?:s|es|ed|ing)?\\b`, 'i');
      if (re.test(lower)) found.add(term);
    }
  }
  return found;
}

/**
 * Chess content present in `out` but absent from `facts` — the additions the
 * phrasing model smuggled in. Returns the offending terms (empty = faithful).
 * Squares embedded in SANs on either side count as mentions, so "Nf3" in the
 * facts licenses "the knight comes to f3" in the output.
 */
export function introducedChessTerms(facts: string, out: string): string[] {
  const violations: string[] = [];
  const factSquares = squaresIn(facts);
  for (const sq of squaresIn(out)) {
    if (!factSquares.has(sq)) violations.push(sq);
  }
  const factConcepts = conceptsIn(facts);
  for (const c of conceptsIn(out)) {
    if (!factConcepts.has(c)) violations.push(c);
  }
  return violations;
}

/** Sentence count — split on terminal punctuation, ignore empties. Decimal
 *  points inside numbers ("2.5 pawns") must not split: only count terminators
 *  followed by whitespace+capital / end of string. */
export function sentenceCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const matches = t.match(/[.!?]+(?=\s+[A-ZÀ-Þ"'(]|\s*$)/g);
  // A text with no terminal punctuation is one sentence.
  return matches ? Math.max(1, matches.length) : 1;
}

/** Padding gate: the phrased output may run at most `slack` sentences past
 *  the facts. Catches contentless rambles ("chess is a beautiful game…")
 *  that the vocabulary scan can't see. Slack 2 leaves the warm registers
 *  room to split a fact across two spoken sentences. */
export function sentenceBudgetExceeded(facts: string, out: string, slack = 2): boolean {
  return sentenceCount(out) > sentenceCount(facts) + slack;
}

/** A GLOSSARY-definition shape — "X is when…", "X means…", "In chess, X…".
 *  Deliberately tighter than any sentence containing "is": "A fork is exactly
 *  what this move creates" APPLIES the concept (kept); "A knight fork is when
 *  a knight attacks two pieces" DEFINES it (the tangent). */
function isDefinitionShaped(sentence: string): boolean {
  const s = sentence.trim();
  if (/^in chess\b/i.test(s)) return true;
  return /\b(?:is|are)\s+when\b|\bmeans\b|\brefers?\s+to\b|\bhappens?\s+when\b|\boccurs?\s+when\b/i.test(s);
}

/**
 * Strip didactic glossary-definition sentences the facts don't license
 * ("A knight fork is when…", "In chess, a pin means…") BEFORE the whole-reject
 * check — surgical: one tangent sentence shouldn't cost the good ones.
 * A definition is licensed ONLY when the facts themselves carry definitional
 * prose for the same concept (the concept-question vertical computes real
 * definitions into its facts; a stats readout never does). Returns the text
 * unchanged when nothing matches.
 */
export function stripUngroundedDefinitions(facts: string, out: string): string {
  const factsDefine = isDefinitionShaped(facts) ||
    facts.split(/(?<=[.!?])\s+/).some(isDefinitionShaped);
  const factConcepts = conceptsIn(facts);
  // Split into sentences (keep terminators) for surgical removal.
  const parts = out.split(/(?<=[.!?])\s+/);
  const kept = parts.filter((sentence) => {
    if (!isDefinitionShaped(sentence)) return true;
    // Definition sentence — allowed only when the facts also DEFINE, and
    // every concept it uses is in the facts.
    if (!factsDefine) return false;
    for (const c of conceptsIn(sentence)) {
      if (!factConcepts.has(c)) return false;
    }
    return true;
  });
  return kept.length === parts.length ? out : kept.join(' ').trim();
}

export interface ContainmentVerdict {
  /** The output to speak: the (possibly definition-stripped) phrasing when it
   *  passes, or null when the caller should serve the computed facts. */
  text: string | null;
  /** Why it tripped (empty when text is non-null). For the audit event. */
  violations: string[];
}

/**
 * The full containment check voiceFacts runs after its number/token nets.
 * Order: strip ungrounded definition sentences first (save the good parts),
 * then reject on any remaining introduced chess term or sentence overrun.
 */
export function containmentCheck(facts: string, out: string): ContainmentVerdict {
  const stripped = stripUngroundedDefinitions(facts, out);
  const introduced = introducedChessTerms(facts, stripped);
  if (introduced.length > 0) return { text: null, violations: introduced };
  if (sentenceBudgetExceeded(facts, stripped)) {
    return {
      text: null,
      violations: [`sentence-budget: ${sentenceCount(stripped)} > ${sentenceCount(facts)}+2`],
    };
  }
  return { text: stripped, violations: [] };
}
