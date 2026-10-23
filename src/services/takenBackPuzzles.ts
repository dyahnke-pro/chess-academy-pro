/**
 * A MISS THE COACH STOPPED, TAKEN BACK, STILL GOES TO THE PUZZLES (David
 * 2026-10-23: "If the user missed it the first time in the game it should go to
 * puzzles" → "Taken back moves should still generate puzzles. But not all undo
 * moves get puzzles. There is a distinction" → the coach flagged it and the
 * student took it back = a puzzle; the student's own Takeback = not; never an
 * inaccuracy).
 *
 * Neither puzzle writer could see it. The game record never holds a move that
 * was taken back, so the end-of-game analysis does not; and a move the coach
 * stops (a focus miss, the castle STOP, "want it back?", the Campaign's miss)
 * holds the board BEFORE Learn schedules its grade, so the live grader never
 * reads it. So it is graded here — the ONE price (`liveMovePrice`, memoized
 * per position and move) and the grader's own rule (`detectSlip`) — for the
 * PUZZLE ONLY: nothing else is recorded, since the focus and the mission have
 * already filed the miss, and a skill is never counted twice.
 */
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { COACH_TURN_DEPTH } from './engineConstants';
import { detectSlip, type SlipSeverity } from './slipDetector';
import { liveMovePrice, mateSwingCostCp, uciOfSan } from './playedMoveGrade';
import type { MovePrice } from './moveCost';
import { addTakenBackMistakePuzzle } from './mistakePuzzleService';
import type { MistakeGamePhase, MistakePuzzle, StockfishAnalysis } from '../types';

/** The severities that make a puzzle: a mistake or worse, never an inaccuracy. */
const PUZZLE_SEVERITY: Record<SlipSeverity, boolean> = {
  inaccuracy: false,
  mistake: true,
  blunder: true,
};

/** What each read may take: the board is the student's, waiting on a retry. */
const READ_BUDGET_MS = 900;

export interface TakenBackMove {
  fenBefore: string;
  playedSan: string;
  /** The game's id (the record's join key); no game, no puzzle. */
  gameId: string | null;
  gamePhase?: MistakeGamePhase;
  moveNumber?: number;
}

export interface TakenBackReads {
  read: (fen: string) => Promise<StockfishAnalysis>;
  price: (fenBefore: string, playedUci: string, fan: StockfishAnalysis) => Promise<MovePrice | null>;
}

const LIVE_READS: TakenBackReads = {
  read: (fen) => stockfishEngine.analyzeWithBudget(fen, COACH_TURN_DEPTH, READ_BUDGET_MS),
  price: (fenBefore, playedUci, fan) => liveMovePrice(fenBefore, playedUci, fan, COACH_TURN_DEPTH),
};

/** A UCI line as SAN from `fen`, stopping at the first move that does not play. */
function sanLine(fen: string, ucis: readonly string[] | undefined, max: number): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of ucis ?? []) {
      if (out.length >= max || !u || u.length < 4) break;
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    }
  } catch { /* what played */ }
  return out;
}

/** Grade the move the coach stopped and the student took back, and file its
 *  puzzle when the grade is a mistake or worse. Null when it was not one, or
 *  could not be priced (unpriced is never a guess). */
export async function fileTakenBackMiss(m: TakenBackMove, reads: TakenBackReads = LIVE_READS): Promise<MistakePuzzle | null> {
  if (!m.gameId) return null;
  const playedUci = uciOfSan(m.fenBefore, m.playedSan);
  if (!playedUci) return null;
  let fenAfter: string;
  let mover: 1 | -1;
  try {
    const c = new Chess(m.fenBefore);
    mover = c.turn() === 'w' ? 1 : -1;
    c.move(m.playedSan);
    fenAfter = c.fen();
  } catch { return null; }
  let before: StockfishAnalysis;
  let after: StockfishAnalysis;
  try {
    [before, after] = await Promise.all([reads.read(m.fenBefore), reads.read(fenAfter)]);
  } catch { return null; }
  // As the live grader does: a mate either way has no centipawn price; its
  // cost is the mate swing the two reads carry.
  const mate = before.isMate || after.isMate;
  const price = mate ? null : await reads.price(m.fenBefore, playedUci, before).catch(() => null);
  if (!price && !mate) return null;
  const evalBefore = price?.scores ? price.scores.bestWhiteCp * mover : before.evaluation * mover;
  const evalAfter = price
    ? (price.scores ? price.scores.playedWhiteCp * mover : evalBefore - price.costCp)
    : after.evaluation * mover;
  const cpLoss = price ? price.costCp : mateSwingCostCp(evalBefore, evalAfter);
  const bestUci = before.bestMove || before.topLines?.[0]?.moves[0];
  const bestSan = bestUci ? sanLine(m.fenBefore, [bestUci], 1)[0] : undefined;
  if (!bestSan) return null;
  const slip = detectSlip({ inBook: false, playedSan: m.playedSan, cpLoss, evalBeforeCp: evalBefore, evalAfterCp: evalAfter, learned: false, bestMoveSan: bestSan });
  if (!slip.isSlip || !slip.severity || !PUZZLE_SEVERITY[slip.severity]) return null;
  return addTakenBackMistakePuzzle({
    fen: m.fenBefore,
    playedSan: m.playedSan,
    bestSan,
    cpLoss,
    ...(m.gamePhase ? { gamePhase: m.gamePhase } : {}),
    ...(m.moveNumber ? { moveNumber: m.moveNumber } : {}),
    evalBefore: before.isMate ? null : evalBefore,
    allowedReplySan: sanLine(fenAfter, after.topLines?.[0]?.moves ?? (after.bestMove ? [after.bestMove] : []), 1)[0] ?? null,
    bestLineSan: sanLine(m.fenBefore, before.topLines?.[0]?.moves ?? [bestUci], 8),
  }, m.gameId);
}
