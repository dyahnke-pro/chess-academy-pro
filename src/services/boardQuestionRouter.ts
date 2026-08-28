// THE BOARD-QUESTION ROUTER (David 2026-08-28) — sort a question by WHAT IT POINTS
// AT (the board entities + the aspect), not by matching phrasings. Deterministic,
// no LLM: extract the squares / pieces / moves / side the ask names, and the
// aspect(s) from the deterministic position-breakdown catalog. Multi-label — an
// ask can fire several aspects; the dispatcher composes their computers. Anything
// board-ish that matches no specific aspect is `scoped` (the scoped catch-all runs
// the position computers on the named entities) — so no board question ever
// reaches the free LLM, and there is no phrasing to "miss".
import type { PieceSymbol } from 'chess.js';
import type { QuestionAspect } from '../data/boardQuestionBuckets';

export interface QuestionFocus {
  /** Board squares the ask names (not the square half of a SAN). */
  squares: string[];
  /** Piece TYPES the ask names. */
  pieces: PieceSymbol[];
  /** SAN move tokens the ask names. */
  moves: string[];
  /** Whose side the ask is about. */
  side: 'me' | 'opponent' | 'neutral';
  /** Ranked aspects, most specific first. Empty + scoped=true → scoped read. */
  aspects: QuestionAspect[];
  /** Board-ish but no specific aspect matched → run the scoped position read. */
  scoped: boolean;
}

const PIECE_SYM: Record<string, PieceSymbol> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

/** A question is board-ish when it names an entity OR uses a board interrogative. */
const BOARD_HINT_RE = /\b(square|piece|move|pawn|knight|bishop|rook|queen|king|position|board|attack|defend|control|threat|hang|safe|tactic|fork|pin|skewer|check|mate|winning|eval|material|plan|develop|center|centre|file|diagonal|outpost|structure|passed|endgame|opening|castle|space|initiative|weak|strong)\b/i;

export function extractQuestionFocus(ask: string | null | undefined): QuestionFocus | null {
  if (!ask) return null;
  const raw = ask.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();

  // Unambiguous MOVES first: piece-moves (Nf3), captures (exd5), castling. Their
  // square halves must not leak into the bare-square scan.
  const UNAMBIG_MOVE = /\b([KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;
  const pieceMoves = raw.match(UNAMBIG_MOVE) ?? [];
  const deMove = t.replace(UNAMBIG_MOVE, (m) => ' '.repeat(m.length));
  // A bare pawn token (e5) is AMBIGUOUS: a square reference ("who controls e5")
  // OR a pawn move ("what happens after e5"). Move-context words disambiguate;
  // default to SQUARE (the more common board question).
  const moveContext = /\b(play|playing|played|push|pushing|pushed|advance|advancing|after|what\s+if|go\s+for|move\s+(?:the|my|to)|what\s+happens)\b/.test(t);
  const barePawn = Array.from(new Set((deMove.match(/(?<![a-z0-9])[a-h][1-8](?![a-z0-9])/g) ?? [])));
  const moves = moveContext ? [...pieceMoves, ...barePawn] : pieceMoves;
  const squares = moveContext ? [] : barePawn;
  const pieces = Array.from(new Set(
    (t.match(/\b(pawn|knight|bishop|rook|queen|king)\b/g) ?? []).map((w) => PIECE_SYM[w]),
  ));

  const meWord = /\b(my|mine|i|me|myself|our|us)\b/.test(t);
  const oppWord = /\b(opponent|opponent'?s|their|theirs|them|they|his|her|enemy|black'?s|white'?s)\b/.test(t);
  const side: QuestionFocus['side'] = oppWord && !meWord ? 'opponent' : meWord && !oppWord ? 'me' : oppWord && meWord ? 'opponent' : 'neutral';

  // ── feature flags ──
  const purpose = /\b(aim(?:ing|s)?|attack(?:ing|s)?|doing|does|cover(?:ing|s)?|eye(?:ing|s)?|control(?:ling|s)?|hit(?:ting|s)?|target(?:ing|s)?|point(?:ing|s)?|rake(?:s|ing)?|see(?:ing|s)?)\b/.test(t);
  const safety = /\b(safe|safely|survive|surviving|hang(?:s|ing)?|protected|defended|drop(?:s|ping)?|en\s*prise|lose\s+(?:my|the|a)\s+\w+)\b/.test(t);
  const control = /\b(control(?:s|ling)?|owns?|contest(?:s|ing)?|dominat\w*|holds?|has|fight(?:s|ing)?\s+for|whose)\b/.test(t);
  const threat = /\b(threat(?:s|en(?:s|ing)?)?)\b/.test(t);
  const hanging = /\b(hang(?:s|ing)?|loose|undefended|en\s*prise|drop(?:s|ping)?)\b/.test(t);
  const check = /\b(check(?:s|ing)?)\b/.test(t) && !/checkmate/.test(t);
  const kingSafety = /\bking\b/.test(t) && /\b(safe|safety|exposed|attack|danger|weak|open|shelter|shield)\b/.test(t);
  const planW = /\b(plan|planning|idea|strategy|aim\s+for|continue|next\s+few\s+moves|what\s+should\s+i\s+be\s+doing)\b/.test(t);
  const bestW = /\b(best\s+(?:move|continuation|option|play|idea)|what\s+should\s+i\s+play|strongest\s+move|what\s+(?:do|should)\s+i\s+do\b)\b/.test(t);
  const evalW = /\b(winning|who'?s\s+(?:better|winning|worse)|how\s+do\s+i\s+stand|evaluation|advantage|am\s+i\s+(?:better|worse|winning|losing)|who\s+is\s+(?:better|winning))\b/.test(t);
  const materialW = /\b(material|up\s+(?:a|the)\s+\w+|down\s+(?:a|the|material)|who\s+has\s+more|piece\s+count|even\s+material)\b/.test(t);
  const consequence = /\b(what\s+happens\s+(?:after|if)|what\s+if\s+i\s+play|after\s+\w)\b/.test(t);
  const movePurposeW = /\b(what\s+does\b.*\b(?:do|accomplish)|point\s+of|idea\s+behind|purpose\s+of|what'?s\s+the\s+point)\b/.test(t);
  const whyFailedW = /\bwhy\b.*\b(?:fail|failed|bad|wrong|lose|loses|losing|blunder|mistake|can'?t\s+i\s+take|not\s+take)\b/.test(t);
  const whyBestW = /\bwhy\b.*\b(?:best|good|strong|works?)\b/.test(t);
  const comparisonW = /\b(better\s+than|or\b.*\?|which\s+is\s+better|vs\.?|versus)\b/.test(t) && moves.length >= 1;
  const masterW = /\b(master(?:s)?|theory|book\s+move|main\s+line|what\s+do\s+(?:the\s+)?(?:pros|gms|grandmasters))\b/.test(t);
  const endgameW = /\b(endgame|end\s*game|is\s+this\s+a\s+draw|tablebase|winning\s+ending)\b/.test(t);
  const moveEvalW = moves.length >= 1 && /\b(good|bad|sound|playable|winning|losing|a\s+mistake|blunder|worth\s+it|ok|okay|fine)\b/.test(t);

  const aspects: QuestionAspect[] = [];
  const add = (a: QuestionAspect): void => { if (!aspects.includes(a)) aspects.push(a); };

  // ── MOVE-focused ──
  if (moves.length >= 1) {
    if (comparisonW) add('move-comparison');
    if (whyBestW && !whyFailedW) add('why-best');
    if (whyFailedW) add('why-failed');
    if (consequence) add('move-consequence');
    if (movePurposeW && !moveEvalW) add('move-purpose');
    if (moveEvalW) add('move-eval');
    if (aspects.length === 0) add(movePurposeW ? 'move-purpose' : 'move-eval');
  }
  // ── SAFETY (piece vs square) ── (the KING is a piece, but king-safety owns it)
  const nonKingPiece = pieces.some((p) => p !== 'k');
  const onSquare = /\bon\s+[a-h][1-8]\b/.test(t);
  // "my knight ON d5 safe" = the piece there; "d5 safe FOR my knight" / "is d5
  // safe" = the square (hypothetical placement).
  if (safety && !kingSafety) {
    if (nonKingPiece && (onSquare || squares.length === 0)) add('piece-safety');
    else if (squares.length >= 1) add('square-safety');
    else if (nonKingPiece) add('piece-safety');
  }
  // ── PIECE purpose ──
  if (nonKingPiece && purpose && !safety) add('piece-purpose');
  // ── SQUARE control ──
  if (squares.length >= 1 && moves.length === 0) {
    if (control) add('square-control');
    else if (!safety && /\bwho\b/.test(t)) add('square-control');
  }
  // ── SIDE / tactics / king / plan / eval ──
  if (threat) add(side === 'me' ? 'my-threats' : 'opponent-threats');
  if (hanging && pieces.length === 0) add('hanging');
  if (kingSafety) add(side === 'opponent' ? 'king-safety-theirs' : 'king-safety-mine');
  if (check) add('checks');
  if (planW) add(side === 'opponent' ? 'opponent-plan' : 'my-plan');
  if (whyFailedW && moves.length === 0) add('why-failed');
  if (masterW) add('master-play');
  if (endgameW) add('endgame-result');
  if (materialW) add('material');
  if (evalW) add('eval');
  if (bestW && moves.length === 0) add('best-move');

  const boardish = squares.length > 0 || pieces.length > 0 || moves.length > 0 || BOARD_HINT_RE.test(t);
  if (aspects.length === 0) {
    if (!boardish) return null;                 // not a board question at all
    return { squares, pieces, moves, side, aspects: [], scoped: true };
  }
  return { squares, pieces, moves, side, aspects, scoped: false };
}

/** The single most-specific aspect (for logging / the primary answer). */
export function classifyBoardQuestion(ask: string | null | undefined): QuestionAspect | 'scoped' | null {
  const f = extractQuestionFocus(ask);
  if (!f) return null;
  return f.aspects[0] ?? (f.scoped ? 'scoped' : null);
}

/** Aspects answered PURELY from chess.js (no Stockfish snapshot needed), so the
 *  grounded dispatcher can answer them from (fen, ask) alone. The engine aspects
 *  (best-move / eval / plan / why-best / master-play / endgame / move-eval /
 *  move-comparison) keep their existing coachApi lanes. */
export const PURE_BOARD_ASPECTS: ReadonlySet<QuestionAspect> = new Set<QuestionAspect>([
  'piece-purpose', 'square-control', 'square-safety', 'square-occupant',
  'piece-safety', 'hanging', 'loose', 'opponent-threats', 'my-threats',
  'king-safety-mine', 'king-safety-theirs', 'king-lines', 'material', 'move-purpose',
]);

/** The first PURE aspect this ask fires, or null. Used by coachService to engage
 *  grounding + suppress the best-move lane so the board answer wins. */
export function pureBoardAspect(ask: string | null | undefined): QuestionAspect | null {
  const f = extractQuestionFocus(ask);
  if (!f) return null;
  for (const a of f.aspects) if (PURE_BOARD_ASPECTS.has(a)) return a;
  return null;
}
