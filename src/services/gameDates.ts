import { db } from '../db/schema';
import { parseGameDate } from './skillTimeline';

/**
 * Every game's date by id, read off the `date` INDEX with a key cursor — no
 * game row is loaded. The heat map needs only these two fields, and reading
 * them through `db.games.toArray()` held a whole extra copy of the library
 * (every PGN and every move's annotations) in memory beside the two other
 * whole-library reads /weaknesses starts on open (2026-11-25: an iPhone with
 * an imported library reloaded on that page within a second of opening it).
 */
export async function gameDatesById(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await db.games.orderBy('date').eachKey((date, cursor) => {
    const d = parseGameDate(typeof date === 'string' ? date : undefined);
    if (d !== null) out.set(String(cursor.primaryKey), d);
  });
  return out;
}
