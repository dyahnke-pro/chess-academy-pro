// settleReads — one engine verdict per move for the opening fact sheets
// (WO-OPENINGS-REWRITE-01).
//
// The sheet reads a board twice: the top three moves together (MultiPV 3) and
// the move played on its own (searchmoves). The two can disagree. MultiPV
// splits the search over three moves, so it can miss a reply that a search of
// one move finds: on the Vienna Copycat board (…Qf6 after Qg4) the top-3 read
// ranks …Qf6 first at -0.14, while …Qf6 read on its own finds 5.Nd5 and says
// -1.55. The sheet printed both ("the engine's first choice" and "costs
// 1.41"), and a writer had to pick one. 724 sheet moves disagreed by 0.3 or
// more.
//
// The fix is to read every candidate the same way when the reads disagree:
// each of the top three on its own, the played move on its own, ranked by
// those reads. Then the ranking, the cost and the eval come from one kind of
// read, and they cannot contradict each other.
import type { NativeLine } from './nativeStockfish';

export type ReadFn = (fen: string, opts: { multipv?: number; searchmoves?: string }) => Promise<NativeLine[]>;

export interface SettledRead {
  /** The candidates, best first for the mover (White's point of view in cp). */
  top: NativeLine[];
  /** The played move's read. */
  played: NativeLine | null;
  /** What the played move gives up against the best, in pawns, mover's view (never below 0). */
  cost: number | null;
  /** True when the top-3 read disagreed and every candidate was read on its own. */
  reread: boolean;
}

/** A disagreement this large (centipawns) between two reads of one move is
 *  re-read, so the list and the cost on the sheet come from one kind of read
 *  (a 0.30 bar left "first choice" and "costs 0.15–0.28" side by side). */
export const DISAGREE_CP = 15;

/** THE NAMING BAR (centipawns): a beat may say "the engine prefers X" only
 *  when X is better than the line's move by this much in TWO reads that agree
 *  (`agreedVerdict`). Measured 2026-11-11 over 6,588 moves of 35 sheets: the
 *  move's own read and the read of the board it leads to (the same position,
 *  one move deeper) differ by 0.15 or more on 1,303 moves (20%), by 0.30 or
 *  more on 196 (3%). A 0.15 bar on one read named better moves inside that
 *  noise: the Nimzo Leningrad's d5 "cost 0.85" on a queen trick the next
 *  board's read, and a depth-20 search, do not find. */
export const NAME_CP = 30;

export async function settleReads(read: ReadFn, fen: string, playedUci: string): Promise<SettledRead> {
  const sign = fen.split(' ')[1] === 'b' ? -1 : 1;
  const mover = (l: NativeLine): number => sign * l.cp;
  const top = await read(fen, { multipv: 3 });
  const played = (await read(fen, { multipv: 1, searchmoves: playedUci }))[0] ?? null;
  if (!played || top.length === 0) return { top, played, cost: null, reread: false };
  const entry = top.find((l) => l.pv[0] === playedUci);
  const disagree = entry
    ? Math.abs(entry.cp - played.cp) >= DISAGREE_CP
    : mover(played) - mover(top[0]) >= DISAGREE_CP;
  if (!disagree) {
    return { top, played, cost: Math.max(0, (mover(top[0]) - mover(played)) / 100), reread: false };
  }
  const each: NativeLine[] = [played];
  for (const l of top) {
    const uci = l.pv[0];
    if (!uci || uci === playedUci) continue;
    const own = (await read(fen, { multipv: 1, searchmoves: uci }))[0];
    if (own) each.push(own);
  }
  const ranked = each.slice().sort((a, b) => mover(b) - mover(a));
  return { top: ranked.slice(0, 3), played, cost: Math.max(0, (mover(ranked[0]) - mover(played)) / 100), reread: true };
}

/** ONE ENGINE VERDICT A BEAT MAY SPEAK. `prefers`: a move beats the line's
 *  move by the naming bar now AND one move deeper — the only verdict that
 *  lets a beat name a better move. `unsettled`: the first read names one, the
 *  deeper read does not agree — the beat names none. `first` / `level`: no
 *  move is ahead by the bar. The same rule Review names a line by
 *  (`lineTrust`: near, or two reads agreed). */
export type EngineVerdict =
  | { kind: 'first' }
  | { kind: 'level' }
  | { kind: 'prefers'; uci: string; now: number; deeper: number }
  | { kind: 'unsettled'; uci: string; now: number; deeper: number };

/** The position's value one move deeper: the top line of the board after the
 *  move, mover's view (cp). A board with no legal move is mate or stalemate. */
async function deeperValue(read: ReadFn, child: { fen: string; mate: boolean; stale: boolean }, sign: number): Promise<number | null> {
  if (child.mate) return 100_000;
  if (child.stale) return 0;
  const top = (await read(child.fen, { multipv: 3 }))[0];
  return top ? sign * top.cp : null;
}

/** The verdict for the move played, from the settled first read and, only
 *  when that read puts a move ahead by the naming bar, the boards one move
 *  deeper. `childOf` plays a move on the board (null when it is not legal). */
export async function agreedVerdict(
  read: ReadFn,
  fen: string,
  playedUci: string,
  settled: SettledRead,
  childOf: (uci: string) => { fen: string; mate: boolean; stale: boolean } | null,
): Promise<EngineVerdict> {
  const sign = fen.split(' ')[1] === 'b' ? -1 : 1;
  const mover = (l: NativeLine): number => sign * l.cp;
  if (!settled.played || settled.top.length === 0) return { kind: 'level' };
  const playedNow = mover(settled.played);
  const ahead = settled.top
    .filter((l) => l.pv[0] && l.pv[0] !== playedUci && mover(l) - playedNow >= NAME_CP)
    .map((l) => ({ uci: l.pv[0], now: mover(l) - playedNow }));
  if (ahead.length === 0) return settled.top[0].pv[0] === playedUci ? { kind: 'first' } : { kind: 'level' };
  const playedChild = childOf(playedUci);
  const playedDeeper = playedChild ? await deeperValue(read, playedChild, sign) : null;
  let agreed: { uci: string; now: number; deeper: number } | null = null;
  let best: { uci: string; now: number; deeper: number } = { uci: ahead[0].uci, now: ahead[0].now, deeper: 0 };
  for (const a of ahead) {
    const child = childOf(a.uci);
    const v = child && playedDeeper !== null ? await deeperValue(read, child, sign) : null;
    const deeper = v !== null && playedDeeper !== null ? v - playedDeeper : 0;
    if (a.uci === best.uci) best = { ...a, deeper };
    if (deeper >= NAME_CP && (!agreed || Math.min(a.now, deeper) > Math.min(agreed.now, agreed.deeper))) agreed = { ...a, deeper };
  }
  return agreed ? { kind: 'prefers', ...agreed } : { kind: 'unsettled', ...best };
}
