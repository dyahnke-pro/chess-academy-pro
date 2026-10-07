// TRADE JUDGEMENT — Learn's door onto THE trade computer (one-coach P2,
// duplicate census group 7, 2026-10-07). There used to be two judges of one
// trade: this file's own rules (bad bishop by centre pawns, a piece within two
// squares of the king, ahead/behind) and `tradeQuality.readTrade` (Review and
// the live read: piece quality, king guards counted only under fire, the
// bishop pair, recapture damage, the settled count, the engine's cost). The
// same trade could be praised on one surface and faulted on the other.
//
// Now there is one judge. This keeps the ONE read readTrade does not have —
// the engine's per-piece table ("their busiest piece", "your best piece") —
// and hands every other verdict to `readTrade`. A TRADE here is board-true:
// the student captured a non-pawn piece and the reply took back on the SAME
// square, like for like.
import { Chess } from 'chess.js';
import type { LastMove } from './material';
import { readTrade } from './tradeQuality';
import { MATERIAL_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';
import { strongestByDelta, weakestByDelta, type PieceValue } from './pieceValueRead';

export type TradeReason = 'their-best' | 'gave-best' | 'good' | 'bad' | 'ahead' | 'behind';

export interface TradeJudgement {
  reason: TradeReason;
  text: string;
  squares: string[];
}

const NAME: Readonly<Record<string, string>> = PIECE_NAMES;

/** `values` = the engine's per-piece table (`evalBoard`) for `fenBefore`, when
 *  the caller has it — the good-piece / bad-piece read (David 2026-09-30). */
export function tradeJudgement(fenBefore: string, san: string, reply: string | null, student: 'w' | 'b', cpLoss: number, values?: readonly PieceValue[], prior: LastMove | null = null): TradeJudgement | null {
  if (!reply) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  if (c.turn() !== student) return null;
  let mine; let theirs;
  try { mine = c.move(san); theirs = c.move(reply.replace(/^…/, '')); } catch { return null; }
  if (!mine.captured || mine.piece === 'p' || mine.piece === 'k') return null;
  if (!theirs.captured || theirs.to !== mine.to) return null;
  if (MATERIAL_VALUE[mine.captured] !== MATERIAL_VALUE[mine.piece]) return null;
  const gave = NAME[mine.piece] ?? 'piece';
  const got = NAME[mine.captured] ?? 'piece';
  // GOOD PIECE, BAD PIECE — read off the engine's table of THIS board, on the
  // same scale-free delta the "trade off their best piece" line uses. Needs
  // pieces of the traded kind on both sides to compare, so both reads must
  // name the traded squares exactly.
  if (values && values.length > 0) {
    const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
    const theirBest = strongestByDelta(values, them);
    const myWorst = weakestByDelta(values, student);
    const myBest = strongestByDelta(values, student);
    const theirWorst = weakestByDelta(values, them);
    if (theirBest?.square === mine.to && theirBest.delta > 0) {
      return { reason: 'their-best', squares: [mine.to], text: `A good trade — their ${got} on ${mine.to} was the piece doing the most work for them${myWorst?.square === mine.from ? `, and it cost you your least useful piece` : ''}.` };
    }
    if (myBest?.square === mine.from && myBest.delta > 0 && theirWorst?.square === mine.to) {
      return { reason: 'gave-best', squares: [mine.from, mine.to], text: `That trade gave up your best piece, the ${gave} on ${mine.from}, for their least useful one — keep the pieces that are working and trade the ones that are not.` };
    }
  }
  // EVERY OTHER VERDICT IS THE ONE TRADE COMPUTER'S.
  const r = readTrade(fenBefore, san, student, cpLoss, prior);
  if (!r || !r.moverIsStudent) return null;
  return { reason: r.call, text: r.text, squares: r.squares };
}
