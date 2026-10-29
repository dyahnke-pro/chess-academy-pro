// masterTree — THE DEEP TREES ON THE PHONE (WO-ALL-OPENINGS-01 P1 + O9,
// David 2026-10-28: "go as deep as chessbase on the forks" · "masters first").
// Built offline from The Week in Chess — every game since 2012 with both
// players rated 2200+, no blitz — every board reached in 10+ of them, to move
// 20 (`scripts/all-openings/build-master-tree.mjs`). Shipped as files the
// phone looks up by the board it walked to (`shard-master-tree.mjs`): the first
// six moves in one root file, a deeper board in the file of the board six
// moves in on the way masters reached it, and any board found by its hash when
// a walk joins it by another move order. Read in the explorer's own shape, so a lesson walk asks
// this first and the live explorer only where the tree has no answer — which
// also keeps the walk off the rate-limited explorer. The ONLINE tree (O9) is
// the same shape, read by the same code from its own folder: strong online
// games past where the masters' run out.
//
// G3: every move here is a move masters played, counted from their games.
import { Chess } from 'chess.js';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';
import { loadDataJson } from './dataFile';

interface TreeIndex {
  source: string;
  /** Boards are in the tree when this many games reached them. */
  min: number;
  /** Plies a game is read to. */
  stop: number;
  /** Plies in: the board this far into the walk picks a file. */
  pre: number;
  /** The board `pre` plies in (FEN's first four fields) → its file. */
  boards: Record<string, number>;
}
/** One move from a board: [san, games, white wins, draws, black wins, average rating of its players]. */
type Row = [string, number, number, number, number, number];
type TreeFile = Record<string, Row[]>;

/** One tree's files: an index, a root file, the shard files and the hash
 *  buckets, all under one folder. Both trees are read the same way. */
interface TreeFiles {
  index: () => Promise<TreeIndex | null>;
  file: (name: string) => Promise<TreeFile | null>;
  bucket: (prefix: string) => Promise<Record<string, number> | null>;
}

/** Through the one data-file door: same-origin on the web; on the iPhone a
 *  LOOKUP — fetched by the piece and never kept (`isLookupPath`). */
async function getJson<T>(path: string): Promise<T | null> {
  return (await loadDataJson(path)) as T | null;
}

/** A failure is not remembered: the next walk asks again. */
function cached<T>(jobs: Map<string, Promise<T | null>>, key: string, load: () => Promise<T | null>): Promise<T | null> {
  let job = jobs.get(key);
  if (!job) {
    job = load();
    jobs.set(key, job);
    void job.then((v) => { if (!v) jobs.delete(key); });
  }
  return job;
}

function treeFiles(base: string): TreeFiles {
  const jobs = new Map<string, Promise<unknown>>();
  return {
    index: () => cached(jobs as Map<string, Promise<TreeIndex | null>>, 'index', () => getJson<TreeIndex>(`${base}index.json`)),
    file: (name) => cached(jobs as Map<string, Promise<TreeFile | null>>, `f:${name}`, () => getJson<TreeFile>(`${base}${name}.json`)),
    bucket: (prefix) => cached(jobs as Map<string, Promise<Record<string, number> | null>>, `h:${prefix}`, () => getJson<Record<string, number>>(`${base}h/${prefix}.json`)),
  };
}

/** The file a board reached by `sans` lives in: the root file in the first
 *  `pre` plies, past them the file of the board `pre` plies in (so two move
 *  orders into one board share it). Null when masters never reached that board
 *  (the walk then asks the live explorer) or `sans` is not legal. Pure. */
export function treeFileFor(index: Pick<TreeIndex, 'pre' | 'boards'>, sans: readonly string[]): string | null {
  if (sans.length < index.pre) return 'root';
  const c = new Chess();
  try {
    for (const s of sans.slice(0, index.pre)) c.move(s);
  } catch {
    return null;
  }
  const n = index.boards[c.fen().split(' ').slice(0, 4).join(' ')];
  return n === undefined ? null : `s${n}`;
}

/** The tree's rows for a board as the explorer's answer. Pure. */
export function rowsToResult(fen: string, rows: readonly Row[]): LichessExplorerResult | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const moves: LichessExplorerMove[] = [];
  let white = 0; let draws = 0; let black = 0;
  for (const [san, , w, d, b, elo] of rows) {
    let uci: string;
    try {
      const mv = board.move(san);
      uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
      board.undo();
    } catch {
      continue; // never hand on a move this board cannot play
    }
    white += w; draws += d; black += b;
    moves.push({ uci, san, averageRating: elo, white: w, draws: d, black: b, game: null });
  }
  return { white, draws, black, moves, topGames: [], opening: null };
}

/** FNV-1a (32 bits, 8 hex) of a board key — the late-transposition fallback's
 *  hash. The shard script runs the same function and pins this vector. Pure. */
export function boardHash(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** What one tree holds for the board `sans` reaches, in the explorer's shape,
 *  or null when it does not hold the board (too few games, past move 20, a path
 *  its players never took, or the files unreachable). */
async function treeAt(files: TreeFiles, sans: readonly string[]): Promise<LichessExplorerResult | null> {
  const index = await files.index();
  if (!index) return null;
  let fen: string;
  try {
    const c = new Chess();
    for (const s of sans) c.move(s);
    fen = c.fen();
  } catch {
    return null;
  }
  const key = fen.split(' ').slice(0, 4).join(' ');
  const name = treeFileFor(index, sans);
  let rows = name ? (await files.file(name))?.[key] : undefined;
  // A TRANSPOSITION: the players mostly reached this board another way (the
  // English joining the King's Indian at move 7; a five-move board most games
  // reached at move 7), so it lives in another file — found by its hash.
  if (!rows) {
    const h = boardHash(key);
    const n = (await files.bucket(h.slice(0, 2)))?.[h.slice(2)];
    if (n !== undefined && `s${n}` !== name) rows = (await files.file(`s${n}`))?.[key];
  }
  return rows ? rowsToResult(fen, rows) : null;
}

const MASTER = treeFiles('/data/master-tree/');
const ONLINE = treeFiles('/data/online-tree/');

/** What masters played from the board `sans` reaches (The Week in Chess, both
 *  players 2200+, over the board, 10+ games), or null. */
export function masterTreeAt(sans: readonly string[]): Promise<LichessExplorerResult | null> {
  return treeAt(MASTER, sans);
}

/** What strong online players played from the board `sans` reaches, where the
 *  master tree has no answer (the Lichess Elite Database: 2400+ vs 2200+, no
 *  bullet, 30+ games — WO-ALL-OPENINGS-01 O9), or null. */
export function onlineTreeAt(sans: readonly string[]): Promise<LichessExplorerResult | null> {
  return treeAt(ONLINE, sans);
}
