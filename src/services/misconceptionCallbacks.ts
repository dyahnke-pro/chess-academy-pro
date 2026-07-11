// misconceptionCallbacks — "we've talked about this" (David 2026-07-11,
// "LOVE THIS"). A real coach remembers you: when a freshly-captured slip
// matches a pattern already in the weakness buckets, the reveal says so with
// COMPUTED history — the count and the recency come from the Dexie records,
// never from the model (G0; the number-fidelity net guards the phrasing).

import { db } from '../db/schema';
import { getMisconceptionTag } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function ordinal(n: number): string {
  const words: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
  return words[n] ?? `${n}th`;
}

function recencyPhrase(lastPriorAt: number, now: number): string {
  const days = Math.floor((now - lastPriorAt) / DAY_MS);
  if (days <= 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 32) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return 'a while back';
}

/**
 * Pure composer — the callback sentence for a tag given its full COUNTED
 * record history (newest capture included). Returns null when this is the
 * first occurrence (nothing to call back to) or the tag is unknown.
 */
export function composeCallbackLine(
  tag: string,
  records: ReadonlyArray<Pick<MisconceptionTagRecord, 'createdAt' | 'counted'>>,
  now: number = Date.now(),
): string | null {
  const def = getMisconceptionTag(tag);
  if (!def) return null;
  const counted = records
    .filter((r) => r.counted !== false)
    .map((r) => r.createdAt)
    .sort((a, b) => a - b);
  const n = counted.length;
  if (n < 2) return null;
  const lastPrior = counted[n - 2];
  const label = def.label.toLowerCase();
  return `We've seen this before — ${label}. That's the ${ordinal(n)} time this pattern has come up; the last one was ${recencyPhrase(lastPrior, now)}.`;
}

/**
 * Dexie-backed lookup: the callback line for a JUST-CAPTURED tag (the fresh
 * record is already stored, so it's part of the count). Null on first
 * occurrence, unknown tag, or any storage error — the callback is a bonus,
 * never a blocker.
 */
export async function buildMisconceptionCallback(tag: string): Promise<string | null> {
  try {
    const records = await db.misconceptionTags.where('tag').equals(tag).toArray();
    return composeCallbackLine(tag, records);
  } catch {
    return null;
  }
}
