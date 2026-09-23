// homeSteerCache — the home steer's in-memory index, as a LEAF (zero runtime
// imports) so both the builder (`homeOpeningSteer`) and the thing that makes
// it stale (`homeOpeningService.persist`) can reach it without a cycle.
//
// WHY THIS EXISTS (walk 4, 2026-09-23). The first opponent move on Play
// missed the home steer on prod twice — with a 4 s cold budget, and again
// after the build itself was cut 5×. The whole cold path is ~500 ms of work
// (measured on David's real 932-game record), but at the coach's FIRST move
// after an import the device is running the 188-game batch analysis on a
// 3-worker pool plus the singleton engine on 4 cores, and a starved main
// thread loses any race. So the first move must never RACE a build: the
// index is warmed ahead of time (boot, import, Play mount) and the warm
// lookup is synchronous — no Dexie, no ranking, nothing to starve.
//
// INVALIDATION IS AN EVENT, NOT A TTL. The old cache expired on a 5-minute
// clock and re-keyed on the game count, which made every warm lookup re-read
// the games table to learn the count. Now the two things that change the
// answer say so: an import (new games) and a home-opening change (a different
// family), each through `invalidateHomeSteer`. A coach game saved mid-session
// is deliberately NOT an invalidation — one more faced game does not move a
// frequency-weighted pick, and the next boot rebuilds anyway.
import type { PlayerColor } from './playerIdentity';

/** fenKey(position before the opponent's move) → san → games. */
export type SteerIndex = Map<string, Map<string, number>>;

export interface HomeSteerEntry {
  index: SteerIndex;
  family: string;
  /** Games that fed the index — for the audit row, never for a lookup. */
  games: number;
  builtAt: number;
  buildMs: number;
}

const entries = new Map<PlayerColor, HomeSteerEntry>();

export function getHomeSteerEntry(colour: PlayerColor): HomeSteerEntry | null {
  return entries.get(colour) ?? null;
}

export function setHomeSteerEntry(colour: PlayerColor, entry: HomeSteerEntry): void {
  entries.set(colour, entry);
}

/** Drop one colour's index, or both. The next pick (or warm) rebuilds. */
export function invalidateHomeSteer(colour?: PlayerColor): void {
  if (colour) entries.delete(colour);
  else entries.clear();
}
