// deepTree — THE ONE GAMES LOOKUP (WO-ALL-OPENINGS-01 O7, David 2026-10-28:
// "masters first, strong online 2200+ past them"). A board's moves come from
// the master tree (2200+ over the board, `masterTreeAt`); where the masters'
// games run out, the strong online games carry the line on — read first from
// the STORED online tree (O9, `onlineTreeAt`: 2400+ vs 2200+, 30+ games), and
// only where neither tree holds the board from the live explorer, through the
// proxy Lichess rate-limits (it refused every read for half an hour on
// 2026-10-29). Every move is a move strong players played (G3).
//
// AN OPENING PAGE READS THE STORED TREES ONLY (`storedTreeAt`, 2026-10-29
// prod audit). With the live explorer under the page's line, the same page
// came out differently by whether Lichess answered: the Paris Gambit handed
// off at 8 AM and built nine tabs from live games at 11, and the Mengarini's
// …e6 tab ran seven plies past the stored trees on live reads, where its plan
// (stored only — a plan walks dozens of boards) could not follow, so the tab
// showed no plan. The page's line, its replies and its plan now read the same
// games. The live explorer stays for a single walk Learn teaches on request
// (`explorerTeachLine`).
import { Chess } from 'chess.js';
import { masterTreeAt, onlineTreeAt } from './masterTree';
import { fetchLichessExplorer } from './lichessExplorerService';
import type { LichessExplorerResult } from '../types';

/** The masters "reached" a board with this many games; below it the line is
 *  a handful of games, not theory (the builders' own walk floor). */
export const MASTERS_ENOUGH = 10;
/** Strong online games are trusted on a board from this many. */
export const ONLINE_ENOUGH = 30;
/** The online buckets read past the masters. */
export const STRONG_ONLINE_RATINGS = '2200,2500';

export type DeepSource = 'masters' | 'online';
export interface DeepAnswer { result: LichessExplorerResult; source: DeepSource }

function total(r: LichessExplorerResult): number {
  return r.white + r.draws + r.black;
}

/** The games at the board `sans` reaches: the master tree when the masters
 *  reached it; past the tree's depth, the live masters database; where the
 *  masters' games run out, strong online games; else what the masters had,
 *  or null. A read that FAILS throws, so a builder marks itself incomplete
 *  instead of keeping a thinner line than the data. */
export async function deepTreeAnswer(sans: readonly string[]): Promise<DeepAnswer | null> {
  const tree = await masterTreeAt(sans);
  if (tree && total(tree) >= MASTERS_ENOUGH) return { result: tree, source: 'masters' };
  const stored = await onlineTreeAt(sans);
  if (stored && total(stored) >= ONLINE_ENOUGH) return { result: stored, source: 'online' };
  let fen: string;
  try {
    const c = new Chess();
    for (const s of sans) c.move(s);
    fen = c.fen();
  } catch {
    return null;
  }
  let masters = tree;
  if (!tree) {
    // Past the tree (move 20, or a board it does not hold): the masters' own
    // database before anything else.
    masters = await fetchLichessExplorer(fen, 'masters');
    if (total(masters) >= MASTERS_ENOUGH) return { result: masters, source: 'masters' };
  }
  const online = await fetchLichessExplorer(fen, 'lichess', { ratings: STRONG_ONLINE_RATINGS });
  if (total(online) >= ONLINE_ENOUGH) return { result: online, source: 'online' };
  return masters && total(masters) > 0 ? { result: masters, source: 'masters' } : null;
}

/** The two STORED trees only — no live read. For a walk that reads dozens of
 *  boards (the plan): live, it got the proxy refused within ten reads. */
export async function storedTreeAnswer(sans: readonly string[]): Promise<DeepAnswer | null> {
  const tree = await masterTreeAt(sans);
  if (tree && total(tree) >= MASTERS_ENOUGH) return { result: tree, source: 'masters' };
  const stored = await onlineTreeAt(sans);
  if (stored && total(stored) >= ONLINE_ENOUGH) return { result: stored, source: 'online' };
  return null;
}

/** The stored trees in the builders' lookup shape: an opening page's line and
 *  replies, so its plan (`storedTreeAnswer`) reads the games that built them. */
export async function storedTreeAt(sans: readonly string[]): Promise<LichessExplorerResult | null> {
  return (await storedTreeAnswer(sans))?.result ?? null;
}
