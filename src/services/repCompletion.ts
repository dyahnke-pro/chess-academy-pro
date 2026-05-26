// Daily "Today's training" rep completion tracking (David 2026-05-26).
// A weakness rep on the Dashboard deep-links into a CAPPED puzzle drill
// (5 puzzles). When the cap is reached the rep is marked done for the day
// so the Dashboard can check it off — but it stays clickable for more.
//
// Stored in the existing key→string `meta` store (no schema bump): one row
// per local day, value = JSON array of completed rep keys.

import { db } from '../db/schema';

/** Puzzles drilled per capped rep before we offer to stop. */
export const REP_PUZZLE_CAP = 5;

const KEY_PREFIX = 'reps-completed:';

function todayKey(): string {
  return `${KEY_PREFIX}${new Date().toISOString().split('T')[0]}`;
}

function parseKeys(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** Rep keys the user has completed (hit the cap on) today. */
export async function getCompletedRepKeysToday(): Promise<Set<string>> {
  const record = await db.meta.get(todayKey());
  return new Set(parseKeys(record?.value));
}

/** Mark a rep done for today. Idempotent. */
export async function markRepCompletedToday(repKey: string): Promise<void> {
  const key = todayKey();
  const record = await db.meta.get(key);
  const keys = parseKeys(record?.value);
  if (keys.includes(repKey)) return;
  keys.push(repKey);
  await db.meta.put({ key, value: JSON.stringify(keys) });
}
