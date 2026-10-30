// facedReplies — WHAT THE STUDENT'S OPPONENTS ACTUALLY PLAYED AGAINST THEM, by
// board (WO-COURSE-01 D, David: "own games first"). The reply tree puts the
// replies the student met in their own games ahead of the rest; this is the
// record that says which. Every game the student played as `colour` (their
// imports and coach games — never a master game, never a seeded fixture) is
// replayed through its opening, and each OPPONENT move is counted at the board
// it was made on, through the ONE replay the home steer uses
// (`addOpponentReplies`).
//
// Built once per colour per session, again only when the game count changes,
// and it hands the thread back every few games — David's record is ~950
// games, and the opening page must stay responsive while it reads them.
import { db } from '../db/schema';
import { isFixtureGame } from './fixtureGames';
import { addOpponentReplies, identityNow, openingSans } from './homeOpeningSteer';
import type { SteerIndex } from './homeSteerCache';
import { fenKey } from './needScore';
import { resolvePlayerColor, type PlayerColor, type PlayerIdentity } from './playerIdentity';
import type { GameRecord } from '../types';

/** Plies of each game read: the reply tree's boards sit inside the opening. */
export const FACED_MAX_PLY = 30;
const YIELD_EVERY = 25;

/** fenKey(board before the opponent's move) → their move (SAN) → times. */
export type FacedIndex = SteerIndex;

function studentPlayed(g: GameRecord, identity: PlayerIdentity, colour: PlayerColor): boolean {
  return !g.isMasterGame && !isFixtureGame(g) && resolvePlayerColor(g, identity) === colour;
}

/** How many times the student met `san` on the board `fenBefore`. */
export function timesFaced(index: FacedIndex | null, fenBefore: string, san: string): number {
  return index?.get(fenKey(fenBefore))?.get(san) ?? 0;
}

const cache = new Map<PlayerColor, { count: number; job: Promise<FacedIndex> }>();

/** The student's faced replies as `colour`, from the games store. Never
 *  rejects: an empty index when the store cannot be read. */
export async function facedRepliesIndex(colour: PlayerColor): Promise<FacedIndex> {
  let count: number;
  try { count = await db.games.count(); } catch { return new Map(); }
  const hit = cache.get(colour);
  if (hit && hit.count === count) return hit.job;
  const job = (async (): Promise<FacedIndex> => {
    const games = await db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray();
    const identity = identityNow();
    const index: FacedIndex = new Map();
    for (let i = 0; i < games.length; i += 1) {
      if (studentPlayed(games[i], identity, colour)) addOpponentReplies(index, openingSans(games[i].pgn, FACED_MAX_PLY), colour);
      if ((i + 1) % YIELD_EVERY === 0) await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    }
    return index;
  })().catch(() => { cache.delete(colour); return new Map() as FacedIndex; });
  cache.set(colour, { count, job });
  return job;
}

/** Test seam. */
export function __resetFacedReplies(): void {
  cache.clear();
}
