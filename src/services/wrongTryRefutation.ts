import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { punishmentOf } from './moveAllowed';
import type { StockfishAnalysis } from '../types';

/** The engine seam, so tests can hand in canned reads. */
export interface RefutationEngine {
  analyzePosition(fen: string, depth: number): Promise<StockfishAnalysis>;
}

export type WrongTryRead =
  /** The try loses something concrete: "Qe3? Then Bxg5, winning your pawn on g5." */
  | { kind: 'refuted'; text: string; replySan: string; replyFrom: string; replyTo: string }
  /** The try is still good, just not the puzzle's line — said honestly. */
  | { kind: 'also-good'; text: string };

const DEPTH = 12;
/** A try that keeps the mover this far ahead is "still good", not wrong. */
const STILL_WINNING_CP = 250;

/**
 * WHAT A WRONG TRY RUNS INTO — Learn's weighing ("you'd love Nd4 — but exd4
 * and it falls apart") brought to the puzzle board (hand walk 2026-10-01: a
 * wrong move was answered with a hint toward the answer and never with why
 * the move tried fails).
 *
 * The engine picks the opponent's best reply to the try; `punishmentOf` says
 * what that reply does, board-checked (mate, fork, material won, pin). Null
 * when the refutation is quiet or positional — the caller keeps its hint, and
 * nothing vague is said (empty > generic).
 *
 * Honesty first: a puzzle accepts one line, but a try can be winning too. When
 * it keeps the mover clearly ahead it is NOT called a mistake.
 */
export async function readWrongTry(
  fen: string,
  trySan: string,
  engine: RefutationEngine = stockfishEngine,
): Promise<WrongTryRead | null> {
  let afterTry: string;
  let moverSign: 1 | -1;
  try {
    const c = new Chess(fen);
    moverSign = c.turn() === 'w' ? 1 : -1;
    if (!c.move(trySan)) return null;
    if (c.isCheckmate()) return { kind: 'also-good', text: `${trySan} is mate too — find the line this puzzle is built on.` };
    afterTry = c.fen();
  } catch {
    return null;
  }

  let read: StockfishAnalysis;
  try {
    read = await engine.analyzePosition(afterTry, DEPTH);
  } catch {
    return null;
  }
  const moverEval = read.evaluation * moverSign; // after the try, mover POV
  if (moverEval >= STILL_WINNING_CP) {
    return { kind: 'also-good', text: `${trySan} still keeps you on top, but there's a sharper move here.` };
  }

  const reply = uciToSan(afterTry, read.bestMove);
  if (!reply) return null;
  const p = punishmentOf(fen, trySan, reply.san);
  if (p) {
    return { kind: 'refuted', text: `${trySan}? Then ${p.replySan}, ${p.gerund}.`, replySan: p.replySan, replyFrom: reply.from, replyTo: reply.to };
  }
  if (read.isMate && moverEval < 0) {
    return { kind: 'refuted', text: `${trySan}? Then ${reply.san}, and they have a forced mate.`, replySan: reply.san, replyFrom: reply.from, replyTo: reply.to };
  }
  return null;
}

function uciToSan(fen: string, uci: string): { san: string; from: string; to: string } | null {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? { san: m.san, from: m.from, to: m.to } : null;
  } catch {
    return null;
  }
}
