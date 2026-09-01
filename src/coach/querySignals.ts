// querySignals — Batch D (David 2026-09-01): the universal SIGNAL-EXTRACTOR that
// WRAPS the existing regex fast-path (never rips it out). Given a user message,
// it computes cheap, orthogonal signals (a SAN? a bare square? self-reference?
// a time reference? a wh-word? a comparison? is a board present?) and maps them
// to a RANKED list of candidate intent lanes.
//
// SCOPE (deliberate, per the plan — "DATA-GATED, rides ALONE"): this ships in
// OBSERVE-ONLY mode. `coachApi` calls it at the points where the regex dispatch
// gave up (the deflections) and LOGS what it would have suggested — it does NOT
// re-route yet. That grows the data that says which phrasings actually miss, so
// the live re-route (a one-line flip on a specific mapping) is targeted, never a
// speculative big-bang dispatch rewrite on a live paying app.
//
// PURE: no imports, no side effects — a deterministic function of the text (plus
// a boardPresent flag). Fully unit-tested; the candidate ranking is the thing
// future routing decisions read.

export interface QuerySignals {
  /** A SAN-shaped move token (Nf3, Bxe5, O-O, e4, exd5, Qh4+, e8=Q). */
  hasSan: boolean;
  /** A bare board square (a1–h8) not part of a SAN. */
  hasSquare: boolean;
  /** First-person reference — the question is about the STUDENT. */
  selfRef: boolean;
  /** Opponent reference — the question is about the other side. */
  oppRef: boolean;
  /** A time / history reference (last game, yesterday, lately, over time). */
  timeRef: boolean;
  /** A wh-question word (what/why/how/which/when/where/who). */
  whWord: boolean;
  /** A comparison (better/worse/than/versus/stronger). */
  comparison: boolean;
  /** A leading imperative verb (teach/show/drill/play/explain/give). */
  imperative: boolean;
  /** Ends like a question (? or a wh-word present). */
  question: boolean;
  /** The surface threaded a live board with this turn. */
  boardPresent: boolean;
  /** No chess-content signal at all → likely banter/meta. */
  chessless: boolean;
}

export type CandidateLane =
  | 'move-eval'          // "is Nf3 good / sound?"
  | 'best-move'          // "what should I play here?"
  | 'position-assessment'// "who's better / how am I doing?"
  | 'weakness'           // "what am I bad at / my weaknesses"
  | 'history'            // "my last game / am I improving"
  | 'theory'             // "how do I play against an IQP" (no self-ref)
  | 'endgame'            // "how do I win K+P"
  | 'opening'            // "teach me the Caro"
  | 'banter';            // greeting / thanks / meta

export interface RankedCandidate { lane: CandidateLane; score: number; }

// A SAN token: castling, or [piece?][disambig?][x?]square[=promo?][+#?], or a
// pawn capture (exd5). Guarded by word boundaries so "backrank" / "a good"
// don't trip it. Case-sensitive on the piece letter (N/B/R/Q/K) by design.
// SAN — an UNAMBIGUOUS move token: castling, a piece move, a pawn capture, or a
// promotion/check. A bare "d5" / "e4" is deliberately NOT here — it is
// indistinguishable from a square reference ("what's on d5"), so it counts as
// `hasSquare` instead. Piece-letter case matters (N/B/R/Q/K).
const SAN_RE = /\b(?:O-O(?:-O)?|[NBRQK][a-h1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|[a-h]x[a-h][1-8](?:=[NBRQ])?[+#]?|[a-h][1-8]=[NBRQ][+#]?)\b/;
const BARE_SQUARE_RE = /\b[a-h][1-8]\b/;
const SELF_RE = /\b(i|i'?m|i'?ve|my|me|mine|myself|we|our)\b/i;
const OPP_RE = /\b(opponent|opponent'?s|they|them|their|theirs|enemy|villain|rival)\b/i;
const TIME_RE = /\b(last\s+game|yesterday|earlier|lately|recently|this\s+week|this\s+month|over\s+time|trend|history|improv(?:e|ing|ement)|progress|games?\s+ago|used\s+to)\b/i;
const WH_RE = /\b(what|why|how|which|when|where|who|whose|whom)\b/i;
const COMPARE_RE = /\b(better|worse|best|worst|stronger|weaker|than|versus|vs\.?|compare|compared|prefer|instead\s+of|or\b)\b/i;
const IMPERATIVE_RE = /^\s*(teach|show|drill|play|explain|give|walk|coach|practi[sc]e|quiz|train)\b/i;
const WEAKNESS_RE = /\b(weak(?:ness(?:es)?|est)?|bad\s+at|struggle|blunder|mistakes?|lose|losing|worst|improve|work\s+on|train)\b/i;
const ENDGAME_RE = /\b(end[\s-]?game|endings?|k\+?p|rook\s+ending|pawn\s+ending|lucena|philidor|opposition|zugzwang)\b/i;
const THEORY_AGAINST_RE = /\b(against|how\s+do\s+i\s+(?:play|meet|handle|face)|deal\s+with|counter)\b/i;
const OPENING_WORD_RE = /\b(opening|defen[cs]e|gambit|variation|line|repertoire|sicilian|caro|french|italian|ruy|london|english|pirc|scandinavian|vienna|scotch|philidor)\b/i;

/** Extract the orthogonal signals from a user message. Pure. */
export function extractQuerySignals(text: string | null | undefined, opts: { boardPresent?: boolean } = {}): QuerySignals {
  const t = (text ?? '').trim();
  const hasSan = SAN_RE.test(t);
  // A bare square that ISN'T already the tail of a SAN token.
  const hasSquare = !hasSan && BARE_SQUARE_RE.test(t);
  const whWord = WH_RE.test(t);
  const selfRef = SELF_RE.test(t);
  const oppRef = OPP_RE.test(t);
  const timeRef = TIME_RE.test(t);
  const comparison = COMPARE_RE.test(t);
  const imperative = IMPERATIVE_RE.test(t);
  const boardPresent = !!opts.boardPresent;
  // "Chessless" = a pure greeting/thanks/meta turn: NO chess vocabulary, NO
  // board, and it doesn't read as a question about the student's play, a
  // position, or theory. A time/self/theory/comparison question is NOT chessless
  // even when it names no piece ("how did my last game go", "how do I meet an
  // isolated pawn") — that was the bug the candidate tests caught.
  const anyChessIntent =
    hasSan || hasSquare || ENDGAME_RE.test(t) || OPENING_WORD_RE.test(t) ||
    WEAKNESS_RE.test(t) || timeRef ||
    (whWord && (comparison || THEORY_AGAINST_RE.test(t) || selfRef));
  return {
    hasSan, hasSquare, selfRef, oppRef, timeRef, whWord, comparison, imperative,
    question: whWord || /\?\s*$/.test(t),
    boardPresent,
    chessless: !anyChessIntent && !boardPresent,
  };
}

/**
 * Rank candidate intent lanes from the signals. Deterministic, additive scores —
 * the ORDER is what matters (the top candidate is what the observe-log records
 * as "what the fast-path probably should have matched"). Empty when the signals
 * point nowhere (the honest "no candidate" — never a guessed lane).
 */
export function rankCandidateLanes(s: QuerySignals, text: string | null | undefined = ''): RankedCandidate[] {
  const t = (text ?? '').toLowerCase();
  const scores = new Map<CandidateLane, number>();
  const add = (lane: CandidateLane, n: number): void => { scores.set(lane, (scores.get(lane) ?? 0) + n); };

  if (s.chessless) add('banter', 5);

  // A concrete move named → judging that move.
  if (s.hasSan) { add('move-eval', 5); if (s.comparison) add('move-eval', 2); }
  // A board + "what to do" with no move named → best-move / assessment.
  if (s.boardPresent && s.whWord && !s.hasSan) {
    if (s.comparison || /\bbetter|winning|worse|assess|evaluat|position\b/.test(t)) add('position-assessment', 4);
    add('best-move', 3);
  }
  // Self + weakness/time → the student's own record.
  if (s.selfRef && WEAKNESS_RE.test(t)) add('weakness', 5);
  if (s.selfRef && s.timeRef) add('history', 5);
  if (s.timeRef && !s.selfRef) add('history', 2);
  // Endgame vocabulary.
  if (ENDGAME_RE.test(t)) add('endgame', s.selfRef && WEAKNESS_RE.test(t) ? 2 : 4);
  // "against <structure>" / "how do I play …" → general theory. The generic "I"
  // in "how do I play against X" trips selfRef, so DON'T exclude on selfRef —
  // only a self+weakness/time question (the student's own record) outscores it.
  if (THEORY_AGAINST_RE.test(t) && s.whWord && !(s.selfRef && (WEAKNESS_RE.test(t) || s.timeRef))) add('theory', 4);
  // Opening name / teach an opening.
  if (OPENING_WORD_RE.test(t)) add('opening', s.imperative ? 4 : 2);

  return [...scores.entries()]
    .map(([lane, score]) => ({ lane, score }))
    .sort((a, b) => b.score - a.score);
}

/** Convenience: the single top candidate lane, or null when nothing scored. */
export function topCandidateLane(text: string | null | undefined, opts: { boardPresent?: boolean } = {}): RankedCandidate | null {
  const ranked = rankCandidateLanes(extractQuerySignals(text, opts), text);
  return ranked[0] ?? null;
}
