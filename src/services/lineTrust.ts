// lineTrust — MAY THE COACH NAME THIS LINE? (WO-DECIDER-02, David 2026-10-28:
// "Name the blow when it lands within 2 moves. Name it 3–5 moves out only when
// the two depths agree" → "Ok to name the line if all forcing moves greater
// than 5. That helps teach calculations.")
//
// Measured on 337 of David's costly moves, re-searched at depths 8–22: the far
// end of an engine line changes as the engine looks deeper. A reason the
// depth-16 line shows within two moves is the one a depth-22 search finds 64%
// of the time, three to five moves out 33%, past five moves 14%. A three-to-
// five-move reason that two reads of the same board agree on held up 53% of
// the time against 18% when they disagreed. So distance decides how much
// evidence a line needs before the coach may say it — never whether the cost
// itself is said (that is the engine's score, and it stands).
//
// ONE rule, read by every surface that names a punishing or winning line.
// Pure: chess.js only.
import { Chess } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';

/** Two moves: the blow is named on one read. */
export const NAME_NEAR_PLIES = 4;
/** Five moves: past two, named only when a second read plays the same line. */
export const NAME_AGREED_PLIES = 10;

export type LineTrustWhy = 'near' | 'agreed' | 'forcing-agreed' | 'verified' | 'unconfirmed' | 'not-forcing' | 'no-line';

/** The line is not an engine's guess — a puzzle's solution, moves a game
 *  actually played, an engine-verified trap line from the data — so its far
 *  end is a fact, never a forecast, and it is named at any distance. */
export const VERIFIED_LINE = 'verified' as const;
/** The other reads of a board, or `VERIFIED_LINE` for a line that is fact. */
export type LineSeconds = ReadonlyArray<readonly string[] | null | undefined> | typeof VERIFIED_LINE;

export interface LineTrust {
  name: boolean;
  why: LineTrustWhy;
  /** Every move of the side that wins, up to the blow, was a check, a capture,
   *  a promotion or a direct threat. */
  forcing: boolean;
  /** A second read of the same board plays the same moves up to the blow. */
  agreed: boolean;
}

/** The moved piece now attacks an enemy piece nothing guards, or one worth
 *  more than itself — a move the other side must answer. */
function threatens(c: Chess, to: string, mover: 'w' | 'b'): boolean {
  const enemy = mover === 'w' ? 'b' : 'w';
  const hitter = c.get(to as never) as { type: string } | undefined;
  if (!hitter) return false;
  for (const row of c.board()) {
    for (const x of row) {
      if (!x || x.color !== enemy || x.type === 'k') continue;
      if (!c.attackers(x.square, mover).includes(to as never)) continue;
      if (c.attackers(x.square, enemy).length === 0 || (MATERIAL_VALUE[x.type] ?? 0) > (MATERIAL_VALUE[hitter.type] ?? 0)) return true;
    }
  }
  return false;
}

/** Is every move `winner` makes in the first `plies` of the line forcing? */
export function lineIsForcing(fen: string, uci: readonly string[], plies: number, winner: 'w' | 'b'): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  for (const u of uci.slice(0, plies)) {
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return false; }
    if (!m) return false;
    if (m.color !== winner) continue;
    if (/[+#]/.test(m.san) || m.captured || m.promotion) continue;
    if (!threatens(c, m.to, winner)) return false;
  }
  return true;
}

/** Does a second read play the same moves as `uci` for its first `plies`? A
 *  read shorter than the blow cannot vouch for it. */
export function readsAgree(uci: readonly string[], seconds: ReadonlyArray<readonly string[] | null | undefined>, plies: number): boolean {
  const n = Math.min(plies, uci.length);
  if (n === 0) return false;
  return seconds.some((s) => !!s && s.length >= n && s.slice(0, n).every((u, i) => u === uci[i]));
}

/**
 * THE ONE NAMING RULE. `plies` is how far into `uci` (from `fen`) the blow
 * lands; `winner` is the side the line wins for; `seconds` are other reads of
 * the SAME board (a shallower iteration of the same search, the record's own
 * read, a deeper read) — never a read of another board.
 *   ≤ 2 moves  — named.
 *   3–5 moves  — named when a second read plays the same line.
 *   past 5     — named when a second read agrees AND every move of the winner
 *                is forcing (David: "that helps teach calculations").
 */
export function lineTrust(args: {
  fen: string;
  uci: readonly string[];
  plies: number;
  winner: 'w' | 'b';
  /** REQUIRED: the other reads of this board (`[]` = this surface has one),
   *  or `VERIFIED_LINE` when the line is fact, not an engine's guess. */
  seconds: LineSeconds;
  /** Plies at the line's end played by CODE, not the engine — a forced
   *  recapture the material count runs past the engine line (`lineWins`). They
   *  are proven, so a second read need agree only up to them. Default 0. */
  provenTail?: number;
}): LineTrust {
  if (args.plies <= 0 || args.uci.length === 0) return { name: false, why: 'no-line', forcing: false, agreed: false };
  const forcing = lineIsForcing(args.fen, args.uci, args.plies, args.winner);
  if (args.seconds === VERIFIED_LINE) return { name: true, why: 'verified', forcing, agreed: true };
  const agreed = readsAgree(args.uci, args.seconds, Math.max(1, args.plies - (args.provenTail ?? 0)));
  if (args.plies <= NAME_NEAR_PLIES) return { name: true, why: 'near', forcing, agreed };
  if (args.plies <= NAME_AGREED_PLIES) return agreed ? { name: true, why: 'agreed', forcing, agreed } : { name: false, why: 'unconfirmed', forcing, agreed };
  if (!agreed) return { name: false, why: 'unconfirmed', forcing, agreed };
  return forcing ? { name: true, why: 'forcing-agreed', forcing, agreed } : { name: false, why: 'not-forcing', forcing, agreed };
}
