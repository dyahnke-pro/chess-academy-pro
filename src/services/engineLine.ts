// engineLine — STOCKFISH'S BEST MOVES PAST THE DATA FLOOR (WO-ALL-SECTION-DEPTH,
// David 2026-11-08: "Stockfish's best moves fill the main line past the data
// floor; club games give the variations"). Most All-section main lines stopped
// where the stored games ran thin — 63% short of a middlegame (measured
// 2026-11-08). From each board a main line stops on, Stockfish's best move was
// played for both sides, offline at depth 15, until the board is a middlegame
// board (`gamesCourse.isMiddlegameBoard`) or move 16
// (`scripts/all-openings/build-engine-lines.mjs`). Shipped as UCI by the board
// (FEN without move counters), sharded by its hash, fetched by the piece and
// never kept on the phone (a LOOKUP, `dataFile.isLookupPath`).
//
// G3: the moves are the ENGINE's, never "a move players played" — the page and
// the lesson say so where they start (`gamesCourse.gamesEndLine`).
import { Chess } from 'chess.js';
import { loadDataJson } from './dataFile';
import { boardHash } from '../utils/boardHash';

export const ENGINE_LINES_DIR = '/data/engine-lines/';

/** The board key a line is filed under: FEN's first four fields. Pure. */
export function engineBoardKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/** The shard a board lives in. Pure. */
export function engineShardFor(key: string): string {
  return boardHash(key).slice(0, 1);
}

/** UCI moves played on from `fen` as SAN, stopping at the first one the board
 *  cannot play. Pure. */
export function uciLineToSan(fen: string, ucis: readonly string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of ucis) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), ...(u[4] ? { promotion: u[4] } : {}) }).san);
    } catch {
      break;
    }
  }
  return out;
}

const files = new Map<string, Promise<Record<string, string> | null>>();

/** Stockfish's best moves (SAN) on from the board `sans` reaches, or null when
 *  none were built for it (a line whose games do not run out there). A file
 *  that fails to load is not remembered, and the read throws, so the builder
 *  marks itself incomplete instead of keeping a thinner line. */
export async function engineLineAt(sans: readonly string[]): Promise<string[] | null> {
  const c = new Chess();
  try { for (const s of sans) c.move(s); } catch { return null; }
  const key = engineBoardKey(c.fen());
  const shard = engineShardFor(key);
  let job = files.get(shard);
  if (!job) {
    job = loadDataJson(`${ENGINE_LINES_DIR}${shard}.json`) as Promise<Record<string, string> | null>;
    files.set(shard, job);
    void job.then((v) => { if (!v) files.delete(shard); }, () => files.delete(shard));
  }
  const file = await job;
  if (!file) throw new Error(`engine lines unreachable: ${shard}`);
  const line: string | undefined = file[key];
  if (!line) return null;
  const san = uciLineToSan(c.fen(), line.split(' ').filter(Boolean));
  return san.length ? san : null;
}
