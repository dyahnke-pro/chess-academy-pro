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

/** A disagreement this large (centipawns) between two reads of one move is re-read. */
export const DISAGREE_CP = 30;

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
