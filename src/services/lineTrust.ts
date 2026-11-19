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
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { exchangeEnd, settledLineEnd } from './material';

/** Two moves: the blow is named on one read. */
export const NAME_NEAR_PLIES = 4;
/** Five moves: past two, named only when a second read plays the same line. */
export const NAME_AGREED_PLIES = 10;

export type LineTrustWhy = 'near' | 'agreed' | 'forcing-agreed' | 'board-proven' | 'forced-mate' | 'verified' | 'unconfirmed' | 'not-forcing' | 'no-line';

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

/** The winner's material on a board, in pawns, White's count turned to `winner`. */
function leadOf(fen: string, winner: 'w' | 'b'): number {
  const b = materialBalance(fen);
  return winner === 'w' ? b : -b;
}

/** What `winner`, to move on `fen`, holds at least: standing still, or its
 *  best capture with the take-backs played out (`exchangeEnd`). A mate in
 *  one is everything. A capture whose count is not a fact yet (the take-back
 *  waits on a check from elsewhere) is not counted. */
function winnerHolds(fen: string, winner: 'w' | 'b'): number {
  let c: Chess;
  try { c = new Chess(fen); } catch { return -Infinity; }
  const base = leadOf(fen, winner);
  let best = base;
  for (const m of c.moves({ verbose: true })) {
    if (m.san.endsWith('#')) return Infinity;
    if (!m.captured && !m.promotion) continue;
    const end = exchangeEnd(fen, m.san);
    if (!end || !end.standing) continue;
    const promo = m.promotion ? (MATERIAL_VALUE[m.promotion] ?? 0) - 1 : 0;
    best = Math.max(best, base + end.net + promo);
  }
  return best;
}

/**
 * THE BOARD PROVES IT (Danya's tries, 2026-11-19: "Rxd8 looks natural, but
 * …Rg2+ Kh1 …Rd2+ Kg1 …Rxd8" — five moves on one engine read, held as
 * unconfirmed, though every move of it is a check or a capture and every
 * reply the only one that does not lose more). A line is not the engine's
 * guess when chess.js alone shows it:
 *   - every move of the winner, to the blow, is a check, a capture or a
 *     promotion (a quiet threat is the engine's judgement, not the board's);
 *   - every reply of the other side is its only legal move, or every other
 *     legal reply leaves the winner at least as much — standing, or with its
 *     best capture played out (`exchangeEnd`) — as the line's settled end; a
 *     mate line asks that every other reply allows mate in one. A reply that
 *     gives check or ends the game another way is counterplay the count
 *     cannot see: the line is not proven.
 * The line must end ahead of where it started, or in mate.
 */
export function boardProvesLine(fen: string, uci: readonly string[], plies: number, winner: 'w' | 'b'): boolean {
  if (plies <= 0 || uci.length < plies) return false;
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  const start = leadOf(fen, winner);
  const steps: Array<{ fenBefore: string; fenAfter: string; uci: string; loser: boolean }> = [];
  for (const u of uci.slice(0, plies)) {
    const fenBefore = c.fen();
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return false; }
    if (!m) return false;
    if (m.color === winner && !/[+#]/.test(m.san) && !m.captured && !m.promotion) return false;
    steps.push({ fenBefore, fenAfter: c.fen(), uci: u, loser: m.color !== winner });
  }
  let end: number;
  if (c.isCheckmate() && c.turn() !== winner) end = Infinity;
  else {
    if (c.isGameOver()) return false;
    const white = settledLineEnd(steps);
    if (white === null) return false;
    end = winner === 'w' ? white : -white;
    if (!(end > start)) return false;
  }
  for (const s of steps) {
    if (!s.loser) continue;
    const legal = new Chess(s.fenBefore).moves({ verbose: true });
    if (legal.length === 1) continue;
    for (const alt of legal) {
      if (`${alt.from}${alt.to}${alt.promotion ?? ''}` === s.uci) continue;
      if (/[+#]/.test(alt.san)) return false;
      const a = new Chess(s.fenBefore);
      a.move(alt);
      if (a.isGameOver()) return false;
      if (winnerHolds(a.fen(), winner) < end) return false;
    }
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
  /** The engine scored this read a forced mate AND the line, played on the
   *  board, ends in checkmate (`costReason` checks the board half). A mate
   *  the search proved over every reply is exact: named at any distance.
   *  Default false. */
  scoredMate?: boolean;
}): LineTrust {
  if (args.plies <= 0 || args.uci.length === 0) return { name: false, why: 'no-line', forcing: false, agreed: false };
  const forcing = lineIsForcing(args.fen, args.uci, args.plies, args.winner);
  if (args.seconds === VERIFIED_LINE) return { name: true, why: 'verified', forcing, agreed: true };
  const agreed = readsAgree(args.uci, args.seconds, Math.max(1, args.plies - (args.provenTail ?? 0)));
  if (args.plies <= NAME_NEAR_PLIES) return { name: true, why: 'near', forcing, agreed };
  if (args.plies <= NAME_AGREED_PLIES && agreed) return { name: true, why: 'agreed', forcing, agreed };
  if (agreed && forcing) return { name: true, why: 'forcing-agreed', forcing, agreed };
  // No second read vouches for it: the engine's forced mate the board plays
  // out to checkmate, or the board itself (`boardProvesLine`), may.
  if (args.scoredMate) return { name: true, why: 'forced-mate', forcing, agreed };
  if (boardProvesLine(args.fen, args.uci, args.plies, args.winner)) return { name: true, why: 'board-proven', forcing, agreed };
  if (args.plies <= NAME_AGREED_PLIES || !agreed) return { name: false, why: 'unconfirmed', forcing, agreed };
  return { name: false, why: 'not-forcing', forcing, agreed };
}
