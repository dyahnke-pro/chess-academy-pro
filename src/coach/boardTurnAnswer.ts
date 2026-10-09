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

/** The kinds the board answers directly. Each is served here or falls back. */
export const BOARD_ANSWERED_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>(['why-best-move', 'candidate-move']);

export interface BoardTurnInput {
  fen: string;
  history: readonly string[];
  studentColor: 'white' | 'black';
}

/** Test seam: the engine reads this answerer uses. */
export interface BoardEngine {
  analysis(fen: string): Promise<Pick<StockfishAnalysis, 'topLines'> | null>;
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
