/**
 * THE ONE SHAPE A PHASE FOCUS IS SCORED BY (`kingAttackJudge`,
 * `endgameTechniqueJudge`). A phase's skill is a KIND of move — an attacking
 * move, a passed pawn pushed, the king brought forward. The board POSES it
 * when the engine's best move is of that kind and beats the best listed move
 * of any other kind by `POSED_MARGIN_CP`; the student HOLDS it with a move of
 * the kind within `HELD_CP` of the best, and MISSES it with a move of another
 * kind that cost at least `MISSED_CP`. Anything between is no verdict: a
 * question the board did not clearly pose is never scored either way.
 *
 * Pure: the engine's own read of the board (the lines the Learn page already
 * holds), chess.js and the kind's reader.
 */
import { Chess, type Color } from 'chess.js';
import { pov, type ReadLine } from './focusChances';

/** The best move of the kind beats every other kind's best by this much. */
export const POSED_MARGIN_CP = 75;
/** A move of the kind this close to the best holds the skill. */
export const HELD_CP = 50;
/** A move of another kind that cost this much misses it. */
export const MISSED_CP = 100;

export interface KindVerdict {
  outcome: 'held' | 'broken';
  /** The engine's best move (UCI) — the move of the kind the board posed. */
  bestUci: string;
  /** What the played move cost against it (a lower bound when the read did
   *  not list it), cp. */
  cost: number;
}

/** The SAN of a UCI move on `fen`, or null. */
export function sanOf(fen: string, uci: string): string | null {
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

function uciOf(fen: string, san: string): string | null {
  try { const m = new Chess(fen).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
}

/** The read, best first for the side to move (null under two lines). */
function rankedLines(fen: string, lines: readonly ReadLine[] | null): ReadLine[] | null {
  if (!lines || lines.length < 2) return null;
  const side: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  return [...lines].filter((l) => l.moves.length > 0).sort((a, b) => pov(b, side) - pov(a, side));
}

/** Does the board POSE the kind — the engine's best move is of it, and beats
 *  the best move of any other kind by the margin? The best move (UCI), or
 *  null. The same question the coach's plant asks of the board it leaves. */
export function posesKind(fen: string, lines: readonly ReadLine[] | null, isKind: (fen: string, uci: string) => boolean): string | null {
  const ranked = rankedLines(fen, lines);
  if (!ranked) return null;
  const side: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const best = ranked[0];
  if (!best || !isKind(fen, best.moves[0])) return null;
  const other = ranked.find((l) => !isKind(fen, l.moves[0]));
  return other && pov(best, side) - pov(other, side) >= POSED_MARGIN_CP ? best.moves[0] : null;
}

/**
 * The verdict for the move `san` on `fenBefore`, the student to move, given
 * the engine's lines on that board and the kind's reader (`isKind(fen, uci)`).
 */
export function judgeMoveKind(
  fenBefore: string,
  san: string,
  lines: readonly ReadLine[] | null,
  isKind: (fen: string, uci: string) => boolean,
): KindVerdict | null {
  const ranked = rankedLines(fenBefore, lines);
  if (!ranked || !posesKind(fenBefore, ranked, isKind)) return null;
  const side: Color = fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  const best = ranked[0];
  const uci = uciOf(fenBefore, san);
  if (!uci) return null;
  const listed = ranked.find((l) => l.moves[0] === uci);
  const floor = pov(ranked[ranked.length - 1], side);
  const cost = Math.max(0, pov(best, side) - (listed ? pov(listed, side) : floor));
  const kind = isKind(fenBefore, uci);
  if (kind && cost <= HELD_CP) return { outcome: 'held', bestUci: best.moves[0], cost };
  if (!kind && cost >= MISSED_CP) return { outcome: 'broken', bestUci: best.moves[0], cost };
  return null;
}
