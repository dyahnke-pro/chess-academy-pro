/**
 * A PREFERENCES WRITE (2026-10-22) — only the keys that changed, as nested
 * keypaths (`preferences.<key>`), merged by Dexie into what is stored NOW.
 *
 * Every writer used to copy the stored preferences, change a key, and write
 * the whole copy back. A writer holding an older copy silently undid every
 * change made since: the Campaign track chosen on the map was reverted at
 * startup, and the coach's spend counter — written on every coach call from a
 * copy read moments before — could revert whatever the student had just set.
 * A write that names only its own keys cannot touch anyone else's.
 */
import type { UpdateSpec } from 'dexie';
import type { UserPreferences, UserProfile } from '../types';

/** The update that sets exactly these keys (undefined deletes one). */
export function preferencesPatch(patch: Partial<UserPreferences>): UpdateSpec<UserProfile> {
  const spec: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) spec[`preferences.${key}`] = value;
  return spec as unknown as UpdateSpec<UserProfile>;
}

/** The update for a writer that built `after` from its copy `before`: the
 *  keys whose values differ, and nothing else. */
export function changedPreferences(before: UserPreferences, after: UserPreferences): UpdateSpec<UserProfile> {
  const was = before as unknown as Record<string, unknown>;
  const now = after as unknown as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
    if (!Object.is(was[key], now[key])) patch[key] = now[key];
  }
  return preferencesPatch(patch as Partial<UserPreferences>);
}
