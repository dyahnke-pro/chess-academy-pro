// clubTree — CLUB GAMES FOR THE ALL SECTION'S VARIATIONS (WO-ALL-SECTION-DEPTH,
// David 2026-11-08: "Stockfish's best moves fill the main line past the data
// floor; club games give the variations"). Where the stored trees (masters,
// then strong online) hold too few games at a board, an All-section page's
// variations read what club players played there: Lichess, both players
// 1200–1999, four months of 2016, move order to move 9
// (`data/sources/club-tree`, built by `build-club-tree.mjs`). Only the boards
// the pages read are shipped (`scripts/all-openings/build-club-index.mjs`),
// in files the phone fetches by the piece and never keeps (a LOOKUP,
// `dataFile.isLookupPath`).
//
// A board is keyed by the MOVE ORDER that reached it (the club tree is built
// that way), sharded by the first two moves. Each row keeps the board's game
// totals and the moves a walk can read — the four most played and every move
// at 8%+ — so a lookup answers exactly as the full tree does.
//
// G3: every move here is a move club players played, counted from their games.
import { Chess } from 'chess.js';
import type { LichessExplorerMove, LichessExplorerResult } from '../types';
import { loadDataJson } from './dataFile';
import { boardHash } from '../utils/boardHash';

export const CLUB_TREE_DIR = '/data/club-tree/';
/** The rating band the club games come from, as a person says it. */
export const CLUB_BAND = '1200–1999';

/** One board: white wins, draws, black wins over every game that reached it,
 *  then the moves kept, each [san, white wins, draws, black wins]. */
export type ClubRow = [number, number, number, ...Array<[string, number, number, number]>];
type ClubFile = Record<string, ClubRow>;

/** The shard a move order lives in: its first two moves. Pure. */
export function clubShardFor(sans: readonly string[]): string {
  return boardHash(sans.slice(0, 2).join(' ')).slice(0, 2);
}

/** A stored row as the explorer's answer — the board's own totals, never the
 *  kept moves' sum. Null when `sans` is not legal. Pure. */
export function clubRowToResult(sans: readonly string[], row: ClubRow): LichessExplorerResult | null {
  const board = new Chess();
  try { for (const s of sans) board.move(s); } catch { return null; }
  const [white, draws, black, ...rows] = row;
  const moves: LichessExplorerMove[] = [];
  for (const [san, w, d, b] of rows) {
    try {
      const mv = board.move(san);
      board.undo();
      moves.push({ uci: `${mv.from}${mv.to}${mv.promotion ?? ''}`, san: mv.san, averageRating: 1600, white: w, draws: d, black: b, game: null });
    } catch {
      continue; // never hand on a move this board cannot play
    }
  }
  return { white, draws, black, moves, topGames: [], opening: null };
}

const files = new Map<string, Promise<ClubFile | null>>();

/** What club players played from the board the move order `sans` reaches, or
 *  null where the index holds no such board. A file that fails to load is not
 *  remembered (the next lookup asks again) and the read throws. */
export async function clubTreeAt(sans: readonly string[]): Promise<LichessExplorerResult | null> {
  const shard = clubShardFor(sans);
  let job = files.get(shard);
  if (!job) {
    job = loadDataJson(`${CLUB_TREE_DIR}${shard}.json`) as Promise<ClubFile | null>;
    files.set(shard, job);
    void job.then((v) => { if (!v) files.delete(shard); }, () => files.delete(shard));
  }
  // Every shard is shipped (an empty one is `{}`), so a file that cannot be
  // had is a failed read, never "no club games": the read throws and the
  // builder marks itself incomplete instead of keeping a thinner page.
  const file = await job;
  if (!file) throw new Error(`club tree unreachable: ${shard}`);
  const row: ClubRow | undefined = file[sans.join(' ')];
  return row ? clubRowToResult(sans, row) : null;
}
