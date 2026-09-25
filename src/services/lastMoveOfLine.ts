// lastMoveOfLine — the raw board data a live surface hands to
// `computePositionFacts.lastMove`: the move just played and the board it was
// played on. A LEAF (chess.js only) so the three hooks that need it do not each
// grow a private replay — the composer computes what the board POSED from
// these two facts; no surface composes that computer itself (B3, 2026-09-22).

import { Chess } from 'chess.js';

/** SANs out of a PGN-ish string: move numbers, dots and results stripped. */
export function sansOfPgn(pgn: string): string[] {
  return pgn
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, ''))
    .filter((t) => t && !/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

export interface LastMoveOfLine {
  fenBefore: string;
  fenAfter: string;
  san: string;
  mover: 'white' | 'black';
}

/** Replay the line; the last legal move and the boards around it. Null on an
 *  empty or illegal line — silence, never a guessed board. */
export function lastMoveOfLine(sans: readonly string[]): LastMoveOfLine | null {
  if (sans.length === 0) return null;
  try {
    const c = new Chess();
    let fenBefore = c.fen();
    let last: { san: string; mover: 'white' | 'black' } | null = null;
    for (const s of sans) {
      fenBefore = c.fen();
      const mover: 'white' | 'black' = c.turn() === 'w' ? 'white' : 'black';
      const mv = c.move(s);
      if (!mv) return null;
      last = { san: mv.san, mover };
    }
    return last ? { fenBefore, fenAfter: c.fen(), san: last.san, mover: last.mover } : null;
  } catch {
    return null;
  }
}

const boardOf = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/**
 * The move to hand the composer as `lastMove`, or null.
 *
 * Only the STUDENT's own move is ever handed over: `capabilitiesPosed` asks what
 * the board posed to the student, so an opponent's move here would file the
 * opponent's posed capabilities under the student. And only when the replayed
 * line actually PRODUCES the board the surface is narrating (`liveFen`) — a
 * PGN that has drifted from the position is not evidence about it.
 *
 * `cpLoss: null` is honest for a ply the surface did not grade: GREEN then
 * withholds (unknown is not clean) while GREY still teaches.
 */
export function lastMoveIfStudent(
  sans: readonly string[],
  studentColor: 'white' | 'black',
  liveFen: string | null,
  cpLoss: number | null = null,
): { fenBefore: string; san: string; cpLoss: number | null; historySans: readonly string[]; reads: null } | null {
  const lm = lastMoveOfLine(sans);
  if (!lm || lm.mover !== studentColor) return null;
  if (liveFen && boardOf(liveFen) !== boardOf(lm.fenAfter)) return null;
  // `reads: null` — a line replayed from a PGN carries no engine reads, so the
  // composer attributes no fundamental here (C4); an honest gap, not a guess.
  // The line itself travels as raw data — the composer asks whether it is theory.
  return { fenBefore: lm.fenBefore, san: lm.san, cpLoss, historySans: sans, reads: null };
}
