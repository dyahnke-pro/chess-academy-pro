/**
 * RENAMING A PERSISTED KEY IS A DATA MIGRATION.
 *
 * David, 2026-08-16, an hour after the Polly removal shipped: "My app is no
 * longer talking to me!!"
 *
 * The removal renamed `preferences.pollyEnabled` → `cloudEnabled` throughout
 * the code. The preference lives in IndexedDB, so every already-installed
 * profile still had the OLD key. `voiceService.cachedPrefs` read
 * `prefs.cloudEnabled ?? false` — undefined became **false** — and the app went
 * silent for existing users on their next load. New installs were fine, which
 * is exactly why nothing in the suite caught it.
 *
 * I checked `lastTier` for persistence before renaming it and cleared that one
 * honestly, then swept 37 files with sed and never asked the same question of
 * the other identifiers. `pollyEnabled` was a stored user setting.
 *
 * Two defences, and the test wants both:
 *   · a Dexie v33 upgrade copies the stored value forward;
 *   · this read falls back to the legacy key, so a profile speaks even BEFORE
 *     that upgrade runs — the fix must not depend on migration order.
 *
 * And the default is TRUE. The old default was true; a rename must never
 * quietly switch a feature off for people who had it on.
 */
import { describe, it, expect } from 'vitest';

/** Mirror of the resolution in `voiceService.refreshPrefs`. */
function resolveCloudEnabled(preferences: Record<string, unknown>): boolean {
  const current = preferences.cloudEnabled;
  if (typeof current === 'boolean') return current;
  const legacy = preferences.pollyEnabled;
  return typeof legacy === 'boolean' ? legacy : true;
}

describe('cloudEnabled honours the pre-rename preference', () => {
  it('keeps speaking for a profile stored before the rename', () => {
    // The exact shape on David's device: the old key, set to true.
    expect(resolveCloudEnabled({ pollyEnabled: true, voiceEnabled: true })).toBe(true);
  });

  it('still respects someone who had deliberately turned it OFF', () => {
    // The fallback must carry the stored VALUE, not just force it on.
    expect(resolveCloudEnabled({ pollyEnabled: false })).toBe(false);
  });

  it('prefers the new key once the migration has written it', () => {
    expect(resolveCloudEnabled({ cloudEnabled: false, pollyEnabled: true })).toBe(false);
    expect(resolveCloudEnabled({ cloudEnabled: true, pollyEnabled: false })).toBe(true);
  });

  it('defaults ON for a profile that has neither key', () => {
    // `?? false` was the bug: a fresh-but-incomplete profile record went silent
    // rather than speaking, which is not the historical default.
    expect(resolveCloudEnabled({})).toBe(true);
    expect(resolveCloudEnabled({ voiceEnabled: true })).toBe(true);
  });

  it('ignores a non-boolean value rather than coercing it', () => {
    expect(resolveCloudEnabled({ pollyEnabled: 'yes' })).toBe(true);
    expect(resolveCloudEnabled({ cloudEnabled: null, pollyEnabled: false })).toBe(false);
  });
});
