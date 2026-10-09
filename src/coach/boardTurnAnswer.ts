/**
 * THE BOARD ANSWERS THE DECODED QUESTION (chat thinks like the coach, David
 * 2026-10-09: "use the llm to decode the question and then point the answer
 * path at the right computer").
 *
 * The door already decodes a turn into a closed form (kind + the move, piece
 * or square it names). Before this, that form was turned back into words
 * (`canonicalAsk`) and sent through the regex lanes again — so "why is Ne4
 * best?" was read correctly and answered about Kh1. Here the decoded turn goes
 * straight to the coach's own computers. Nothing is re-worded.
 *
 * Phase 1: a question about ONE move the student could play now. The move is
 * weighed by the coach's own weighing (`buildDeliberation`) beside the
 * engine's candidates, with its own engine line.
 */
import { Chess } from 'chess.js';
import type { ResolvedChatTurn, ChatKind } from './chatTurn';
import { buildDeliberation, namedMoveAnswer } from '../services/deliberation';
import { getCachedStockfish } from '../hooks/stockfishFenCache';
import { searchUntilStable } from '../services/searchDepth';
import { stockfishEngine } from '../services/stockfishEngine';
import { buildCandidateEval } from '../services/enginePlanContext';
import type { StockfishAnalysis } from '../types';
import { computePositionFacts, type ClauseItem } from '../services/positionFacts';
import { FACT_LAYER, type FactKind } from '../services/reviewFacetRank';
import { lastMoveIfStudent, lastMoveIfOpponent } from '../services/lastMoveOfLine';
import { computeMustDefend } from '../services/threatOut';
import { boardPlanFacts } from '../services/boardPlanFacts';

/** The kinds the board answers directly. Each is served here or falls back. */
export const BOARD_ANSWERED_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>(['why-best-move', 'candidate-move', 'plan', 'tactics']);

export interface BoardTurnInput {
  fen: string;
  history: readonly string[];
  studentColor: 'white' | 'black';
}

/** Test seam: the engine reads this answerer uses. */
export interface BoardEngine {
  analysis(fen: string): Promise<Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl'> | null>;
  candidate(fen: string, san: string): Promise<{ evalCp: number | null; mateIn: number | null; lineUci: string[] } | null>;
}

const defaultEngine: BoardEngine = {
  async analysis(fen) {
    const cached = getCachedStockfish(fen);
    if (cached?.topLines?.some((l) => l.moves?.length)) return cached;
    try { return (await searchUntilStable(fen, 'question', stockfishEngine)).analysis; } catch { return null; }
  },
  candidate: (fen, san) => buildCandidateEval(fen, san),
};

let engineOverride: BoardEngine | null = null;
export function setBoardEngineForTests(e: BoardEngine | null): void { engineOverride = e; }

/** The answer to a decoded move question, or null to fall back to the lanes. */
export async function answerBoardTurn(turn: ResolvedChatTurn, board: BoardTurnInput): Promise<string | null> {
  if (!BOARD_ANSWERED_KINDS.has(turn.kind)) return null;
  if (turn.kind === 'plan' || turn.kind === 'tactics') return answerFromRead(turn, board);
  const moves = turn.referents.filter((r): r is Extract<typeof r, { type: 'move' }> => r.type === 'move');
  // Phase 1: exactly one named move, playable now, on the student's turn.
  if (moves.length !== 1 || moves[0].played) return null;
  let chess: Chess;
  try { chess = new Chess(board.fen); } catch { return null; }
  const mover = chess.turn();
  if ((board.studentColor === 'white' ? 'w' : 'b') !== mover) return null;
  let uci: string;
  let san: string;
  try {
    const m = new Chess(board.fen).move(moves[0].san);
    if (!m) return null;
    uci = `${m.from}${m.to}${m.promotion ?? ''}`;
    san = m.san;
  } catch { return null; }
  const engine = engineOverride ?? defaultEngine;
  const analysis = await engine.analysis(board.fen);
  if (!analysis?.topLines?.length) return null;
  const cand = await engine.candidate(board.fen, san);
  // The engine normalises every read to White's view, like `topLines`.
  const named = cand
    ? {
      lineUci: [uci, ...cand.lineUci],
      evaluation: cand.evalCp ?? 0,
      mate: cand.mateIn,
    }
    : { lineUci: [uci], evaluation: 0, mate: null };
  const opponentLastSan = board.history.length ? board.history[board.history.length - 1] : null;
  const d = buildDeliberation({ analysis, fenBefore: board.fen, moverColor: mover, opponentLastSan, named, maxCandidates: 4 });
  if (!d) return null;
  return namedMoveAnswer(d, turn.kind === 'why-best-move' ? 'why-best' : 'is-it-good');
}

/** Facts the student must answer right now — they lead any board answer. */
const URGENT_KINDS: ReadonlySet<string> = new Set(['must-defend', 'latent-danger', 'tactic', 'trapped', 'loose', 'threat', 'bluff']);
/** Never part of an answer to a question: the coaching habit and the weighing
 *  (a best-move question gets the weighing through its own path). */
const NOT_AN_ANSWER: ReadonlySet<string> = new Set(['method', 'deliberation']);

/**
 * THE QUESTION ANSWERED FROM THE ONE READ — the coach's own board read, run
 * in the `asked` posture so every computer speaks, then selected by what was
 * asked: the safety layer for "any tactics?", what cannot wait and then the
 * plan layer for "what's my plan?". Ordered by the read's own rank; a fact
 * whose squares an earlier one already covers is the same claim and goes.
 */
async function answerFromRead(turn: ResolvedChatTurn, board: BoardTurnInput): Promise<string | null> {
  if (turn.seat === 'them') return turn.kind === 'plan' ? theirPlanAnswer(board) : null;
  const engine = engineOverride ?? defaultEngine;
  const analysis = await engine.analysis(board.fen);
  if (!analysis?.topLines?.length) return null;
  const student = board.studentColor === 'white' ? 'w' : 'b';
  const sans = [...board.history];
  const lm = lastMoveIfStudent(sans, board.studentColor, board.fen);
  const om = lastMoveIfOpponent(sans, board.studentColor, board.fen);
  let read;
  try {
    read = await computePositionFacts({
      posture: 'asked', fen: board.fen,
      moverColor: board.fen.split(' ')[1] === 'b' ? 'b' : 'w', studentColor: student,
      analysis,
      ...(lm ? { lastMove: lm } : {}), ...(om ? { opponentLastMove: om } : {}), history: sans,
    });
  } catch { return null; }
  const layer = (c: ClauseItem): string => FACT_LAYER[c.kind as FactKind] ?? 'plan';
  const pool = read.candidates.filter((c) => !NOT_AN_ANSWER.has(c.kind));
  const urgent = pool.filter((c) => URGENT_KINDS.has(c.kind)).sort((a, b) => b.rank - a.rank);
  const rest = turn.kind === 'tactics'
    ? pool.filter((c) => layer(c) === 'safety' && !URGENT_KINDS.has(c.kind)).sort((a, b) => b.rank - a.rank)
    : pool.filter((c) => layer(c) === 'plan').sort((a, b) => b.rank - a.rank);
  const chosen: ClauseItem[] = [];
  const covered = new Set<string>();
  for (const c of [...urgent, ...rest]) {
    const sq = c.squares ?? [];
    if (sq.length > 0 && sq.every((q) => covered.has(q))) continue;
    chosen.push(c);
    for (const q of sq) covered.add(q);
  }
  if (chosen.length === 0) return null;
  return chosen.map((c) => c.text.trim()).join(' ');
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * THEIR PLAN — "what is black trying to do?". What they hit right now (the
 * same must-defend the narration speaks), then the levers their side of the
 * structure offers, read by the one plan computer in their voice. Board facts
 * only (WO-OUTCOME-01 C): who attacks what, never what a capture would net.
 */
export function theirPlanAnswer(board: BoardTurnInput): string | null {
  const student: 'w' | 'b' = board.studentColor === 'white' ? 'w' : 'b';
  const them: 'white' | 'black' = board.studentColor === 'white' ? 'black' : 'white';
  const parts: string[] = [];
  const md = computeMustDefend(board.fen, student);
  for (const h of md.pieces) {
    if (!h.attacker || !h.attackerSquare) continue;
    parts.push(`Their ${PIECE_NAME[h.attacker]} on ${h.attackerSquare} is after your ${PIECE_NAME[h.piece]} on ${h.square}${h.defenders === 0 ? ', which nothing guards' : ''}.`);
  }
  const facts = boardPlanFacts(board.fen, them, 'they');
  if (facts && facts.levers.length) {
    parts.push(`Beyond that, they want to ${facts.levers.map((l) => l.phrase).join('; ')}.`.replace(/^Beyond that, they/, parts.length ? 'Beyond that, they' : 'They'));
  }
  return parts.length ? parts.join(' ') : null;
}
