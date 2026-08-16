// IS THERE ACTUALLY A "STRONGEST" REPLY?
//
// 🔒 DAVID 2026-08-16: "a lot of suggestions are bad."
//
// They were not bad moves. I scored every recommendation in his prod log at
// depths 12, 14 and 20 and each was within 2-26cp of best. Two of the four were
// not the engine's top move at ANY depth — and both were announced with the
// superlative: "Your strongest reply here is Be3" (Bd2 and Bh4 are better),
// "Your strongest reply here is Nxf5" (Nf3 is better at every depth).
//
// The gap in both cases was 10-18cp, which is not a mistake — it is the width
// of the position. Several moves hold the edge and the engine's ordering
// between them is noise that flips depth to depth. Saying "strongest" there
// overclaims twice: it asserts a ranking the search does not support, and it
// teaches the student that chess has one answer per position when this one
// plainly does not.
//
// We already pay for the information that settles it. The engine runs MultiPV
// 3 (`stockfishEngine.ts:984`), so the runner-up and its score come back with
// every read and are thrown away. Keeping them costs nothing and turns an
// overclaim into better coaching: "two good moves here" IS the lesson when the
// position has two.
//
// G0: the engine decides which moves and how far apart; this only picks the
// sentence shape.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';

/** How far clear the top line must be before the word "strongest" is earned.
 *
 *  Half a pawn — the same boundary `INACCURACY_CP` uses for "Stockfish stops
 *  calling this noise". Below it, depth-to-depth wobble reorders the lines:
 *  on his board Bd2/Bh4/Be3 came back 175/169/158 at depth 14 and 190/180 at
 *  depth 20, with the top two swapping places. A number that changes with
 *  depth is not a ranking to speak in superlatives. */
export const CLEAR_BEST_CP = 50;

export interface RankedReply {
  /** The engine's first line. */
  bestSan: string;
  /** The engine's second line, when it is close enough to be worth naming. */
  alsoSan: string | null;
  /** Centipawns between the top two lines — 0 when there is only one. */
  gap: number;
  /** True when the top move is clear enough to call strongest. */
  clear: boolean;
}

/**
 * Rank the engine's own candidate moves for `fen`.
 *
 * Returns null when there is nothing to rank (no analysis, no legal first
 * move) — callers then keep whatever they did before, so a single-PV engine or
 * a cache miss degrades to the old behaviour rather than going quiet.
 */
export function rankReplies(fen: string, analysis: StockfishAnalysis | null | undefined): RankedReply | null {
  const lines = analysis?.topLines?.filter((l) => l.moves?.length);
  if (!lines?.length) return null;
  const sanOf = (uci: string): string | null => {
    try {
      const c = new Chess(fen);
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
      return m?.san ?? null;
    } catch { return null; }
  };
  const bestSan = sanOf(lines[0].moves[0]);
  if (!bestSan) return null;
  const second = lines[1];
  if (!second) return { bestSan, alsoSan: null, gap: 0, clear: true };

  // A MATE IS ALWAYS CLEAR. Comparing a mate score against a centipawn score
  // as two numbers is how "mate in two" ends up 30cp from a quiet move.
  const bestMate = lines[0].mate != null;
  const secondMate = second.mate != null;
  if (bestMate !== secondMate) return { bestSan, alsoSan: null, gap: Infinity, clear: true };

  // ABSOLUTE DIFFERENCE, deliberately. The engine has already ordered these
  // best-first, so which sign means "better" depends on whose perspective the
  // evaluation carries — and the ordering answers that question for us. Taking
  // the magnitude means this cannot be broken by a perspective flip upstream.
  const gap = Math.abs((lines[0].evaluation ?? 0) - (second.evaluation ?? 0));
  const alsoSan = sanOf(second.moves[0]);
  if (!alsoSan || alsoSan === bestSan) return { bestSan, alsoSan: null, gap, clear: true };
  return { bestSan, alsoSan, gap, clear: gap >= CLEAR_BEST_CP };
}

/**
 * The sentence to speak for a recommended move.
 *
 * `why` is the computed consequence clause for the TOP move — it stays
 * attached to that move and is never spread across both, because it is only
 * true of one of them.
 */
export function bestReplyLine(ranked: RankedReply, why: string): string {
  if (ranked.clear || !ranked.alsoSan) {
    return `Your strongest reply here is ${ranked.bestSan}${why}.`;
  }
  // TWO GOOD MOVES IS THE LESSON. Not a hedge — a position with two answers
  // teaches something a position with one does not, and the student can see
  // both on the board.
  return `Two good moves here — ${ranked.bestSan}${why}, or ${ranked.alsoSan}.`;
}
