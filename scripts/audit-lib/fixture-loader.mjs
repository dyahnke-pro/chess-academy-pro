// Shared real-data fixture loader for audit-*.mjs scripts.
//
// The fixture is David's "Send my data" drop: his real games, analysis and
// skill record. Fetch the newest with `node scripts/read-data-drop.mjs --latest`
// (it lands at `audit-reports/.fixtures/data-drop-david.json`, gitignored).
//
// Audit scripts call `loadFixtureIntoIDB(page)` at the top of their
// flow — typically right after the page mounts and any cold-cache
// clear. When the fixture file is present, every relevant store
// (games, mistakePuzzles, classifiedTactics, setupPuzzles,
// profiles, openings, openingWeakSpots, flashcards) gets populated
// with David's real account data before scenarios run. When absent
// the helper logs and resolves to `{ loaded: false }` so the
// script can fall back to synthetic seeding.
//
// Usage:
//   import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
//   const fixtureResult = await loadFixtureIntoIDB(page);
//   if (fixtureResult.loaded) {
//     console.log(`fixture: ${fixtureResult.wrote} rows`);
//   }
//
// The fixture path can be overridden via the AUDIT_FIXTURE env var
// (useful for testing against a different snapshot).
//
// Idempotent: re-running just overwrites. Safe to call on every
// pass. Skips stores the audit browser's schema doesn't recognize
// so a newer-schema fixture doesn't crash an older-schema script.

import { readFile, stat } from 'node:fs/promises';

const DEFAULT_FIXTURE_PATH =
  process.env.AUDIT_FIXTURE ?? 'audit-reports/.fixtures/data-drop-david.json';

/**
 * Load a Dexie-export fixture into the audit browser's IndexedDB.
 *
 * @param {import('playwright').Page} page  Playwright page already
 *   pointed at the app (so ChessAcademyDB exists).
 * @param {string} [fixturePath]            Optional override.
 * @returns {Promise<{
 *   loaded: boolean;
 *   path: string;
 *   wrote?: number;
 *   stores?: number;
 *   perStore?: Record<string, number>;
 *   skipped?: string[];
 *   reason?: string;
 * }>}
 */
export async function loadFixtureIntoIDB(page, fixturePath = DEFAULT_FIXTURE_PATH) {
  try {
    await stat(fixturePath);
  } catch (err) {
    return {
      loaded: false,
      path: fixturePath,
      reason: err.code === 'ENOENT' ? 'fixture file not found' : err.message,
    };
  }

  let fixture;
  try {
    const raw = await readFile(fixturePath, 'utf-8');
    fixture = JSON.parse(raw);
  } catch (err) {
    return { loaded: false, path: fixturePath, reason: `parse failed: ${err.message}` };
  }

  if (!fixture?.stores || typeof fixture.stores !== 'object') {
    return { loaded: false, path: fixturePath, reason: 'fixture missing stores object' };
  }

  const result = await page.evaluate(async (data) => {
    const STORES = Object.keys(data.stores ?? {});
    if (STORES.length === 0) return { wrote: 0, stores: 0, perStore: {}, skipped: [] };
    return await new Promise((resolve, reject) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => reject(new Error('open failed'));
      req.onsuccess = () => {
        const db = req.result;
        const present = STORES.filter((s) => db.objectStoreNames.contains(s));
        const skipped = STORES.filter((s) => !db.objectStoreNames.contains(s));
        if (present.length === 0) {
          db.close();
          resolve({ wrote: 0, stores: 0, perStore: {}, skipped });
          return;
        }
        const tx = db.transaction(present, 'readwrite');
        const counts = {};
        for (const s of present) {
          const rows = data.stores[s];
          counts[s] = Array.isArray(rows) ? rows.length : 0;
          if (Array.isArray(rows)) {
            const store = tx.objectStore(s);
            // A profile carries its DEVICE's live-stream settings (David's
            // real secret). Loaded as-is, the page streams with that secret
            // and the audit's own listener rejects every event — the walk
            // then reads "0 words" on turns the coach spoke (2026-10-19).
            // The record is the student's; the stream belongs to this run.
            for (const r of rows) {
              if (s === 'profiles' && r && r.preferences) {
                r.preferences = { ...r.preferences, auditStreamUrl: null, auditStreamSecret: null };
              }
              store.put(r);
            }
          }
        }
        tx.oncomplete = () => {
          db.close();
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          resolve({ wrote: total, stores: present.length, perStore: counts, skipped });
        };
        tx.onerror = () => { db.close(); reject(new Error('fixture put failed')); };
      };
    });
  }, fixture);

  return {
    loaded: true,
    path: fixturePath,
    ...result,
  };
}

/**
 * Convenience wrapper for scripts that want a one-liner that
 * also reloads the page so React picks up the imported data.
 *
 * @param {import('playwright').Page} page
 * @param {string} reloadUrl       URL to goto after import.
 * @param {string} mountTestId     Testid to wait for after reload.
 * @param {string} [fixturePath]
 */
export async function loadFixtureAndReload(page, reloadUrl, mountTestId, fixturePath = DEFAULT_FIXTURE_PATH) {
  const result = await loadFixtureIntoIDB(page, fixturePath);
  if (result.loaded) {
    await page.goto(reloadUrl, { timeout: 60_000 });
    await page.locator(`[data-testid="${mountTestId}"]`).waitFor({ timeout: 60_000 });
  }
  return result;
}
