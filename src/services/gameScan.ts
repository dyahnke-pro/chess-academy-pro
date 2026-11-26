/**
 * 🔒 THE LIBRARY IS NEVER HELD WHOLE (2026-11-26). An App Store user with a big
 * imported library had iOS kill the web view within seconds of opening
 * /weaknesses, every time. The page and the buttons on it each ran
 * `db.games.filter(…).toArray()` — the analyse button's plan, the home-opening
 * ranking under it, the insights, the weakness spine — and each one
 * materialised EVERY game record (every PGN with its clock comments, every
 * move's engine lines and candidate reads, every coach transcript) at once, so
 * a phone held several whole copies of the library to answer questions that
 * need a few fields a game.
 *
 * `scanGames` is the one way to walk the library: it reads the primary keys,
 * fetches rows a page at a time, hands each FULL row to `project` and keeps
 * only what that returns, handing the thread back between pages. At most one
 * page of full records is alive at any moment, whatever the library's size.
 * `GameHeader` is the slim shape most readers need.
 */
import { db } from '../db/schema';
import type { GameRecord } from '../types';
import { pickRows } from './stampScan';

/** Rows fetched per page — the most full records a scan holds at once. */
export const SCAN_PAGE_SIZE = 40;

/** The fields a game's identity, seat, result and opening are read from — no
 *  PGN, no annotations, no transcript. */
export type GameHeader = Pick<GameRecord,
  'id' | 'white' | 'black' | 'result' | 'date' | 'event' | 'eco' | 'whiteElo' | 'blackElo'
  | 'source' | 'openingId' | 'isMasterGame' | 'studentSide' | 'fixture' | 'tacticsClassifiedRev'
  | 'chesscomAccuracy' | 'termination'>;

export function headerOf(g: GameRecord): GameHeader {
  return {
    id: g.id, white: g.white, black: g.black, result: g.result, date: g.date, event: g.event,
    eco: g.eco, whiteElo: g.whiteElo, blackElo: g.blackElo, source: g.source, openingId: g.openingId,
    isMasterGame: g.isMasterGame, studentSide: g.studentSide, fixture: g.fixture,
    tacticsClassifiedRev: g.tacticsClassifiedRev, chesscomAccuracy: g.chesscomAccuracy, termination: g.termination,
  };
}

/**
 * Walk every game, page by page, keeping what `project` returns (null drops
 * the game). `project` may be async; it is the only place a full record is
 * seen, and the record is released once its page is done.
 */
export async function scanGames<T>(
  project: (game: GameRecord) => T | null | Promise<T | null>,
  opts: { pageSize?: number } = {},
): Promise<T[]> {
  const keys = await db.games.toCollection().primaryKeys();
  return pickRows(db.games, keys, project, Math.max(1, opts.pageSize ?? SCAN_PAGE_SIZE));
}
