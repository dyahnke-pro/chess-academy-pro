/**
 * fixture-loader.mjs — bulk-load a Dexie snapshot into a Playwright
 * page's IndexedDB so audit scripts run against REAL user data
 * instead of seeded toy puzzles.
 *
 * The fixture is David's exported Dexie snapshot, saved at
 * `audit-reports/.fixtures/david-games.json` (gitignored, refresh
 * by re-running the DevTools export snippet in the prod app).
 *
 * Shape (matches the DevTools snippet's `out` variable):
 *   {
 *     "stores": {
 *       "games":         [ ...GameRecord[] ],
 *       "mistakePuzzles":[ ...MistakePuzzle[] ],
 *       "profiles":      [ ...UserProfile[] ],
 *       "openings":      [ ...OpeningRecord[] ],
 *       ...one entry per Dexie table the user has data in
 *     }
 *   }
 *
 * Usage (per David's spec 2026-05-19):
 *
 *   import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
 *
 *   // ...after page mounts:
 *   const fixture = await loadFixtureIntoIDB(page);
 *   if (fixture.loaded) {
 *     await page.goto(`${BASE_URL}/<surface>`);
 *     await page.locator('[data-testid="<mount>"]').waitFor();
 *   }
 *
 * Returns `{ loaded, wrote, stores, perStore, skipped }` so the
 * caller can log how much real data populated which stores. When
 * the fixture file is missing the loader returns
 * `{ loaded: false, skipped: 'fixture-missing' }` and the audit
 * proceeds against whatever the page would normally seed itself.
 */
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_FIXTURE_PATH = join(
  process.cwd(),
  'audit-reports',
  '.fixtures',
  'david-games.json',
);

/** @typedef {object} FixtureLoadResult
 *  @property {boolean} loaded   — true when bytes were written to IDB.
 *  @property {number}  wrote    — total rows inserted across all stores.
 *  @property {string[]} stores  — names of stores that received rows.
 *  @property {Record<string, number>} perStore — per-store row counts.
 *  @property {string=} skipped  — reason when loaded=false ('fixture-missing'
 *                                  | 'parse-error' | 'db-not-found').
 */

/** Load the fixture (if present) and bulk-put every row into the
 *  page's ChessAcademyDB. Idempotent — re-running overwrites existing
 *  rows by primary key. */
export async function loadFixtureIntoIDB(page, opts = {}) {
  const fixturePath = opts.path ?? DEFAULT_FIXTURE_PATH;

  // Defensive: skip cleanly if the user never exported their data
  // (cold-clone, first-time contributor) — audits should still run
  // with whatever the app seeds on its own.
  try {
    await stat(fixturePath);
  } catch {
    return { loaded: false, wrote: 0, stores: [], perStore: {}, skipped: 'fixture-missing' };
  }

  let raw;
  try {
    raw = await readFile(fixturePath, 'utf-8');
  } catch (e) {
    return { loaded: false, wrote: 0, stores: [], perStore: {}, skipped: `read-error:${e?.message ?? e}` };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { loaded: false, wrote: 0, stores: [], perStore: {}, skipped: `parse-error:${e?.message ?? e}` };
  }

  const stores = parsed?.stores;
  if (!stores || typeof stores !== 'object') {
    return { loaded: false, wrote: 0, stores: [], perStore: {}, skipped: 'no-stores-key' };
  }

  // Inject into IDB. We open the existing Dexie DB by name (whichever
  // version is current — Dexie sees us as "any client" and serves the
  // store list). Bulk-put preserves primary keys so re-running is
  // idempotent. Some stores are out-of-line (key in the data itself);
  // we don't pass an explicit key, the object store reads its declared
  // keyPath off the row.
  const result = await page.evaluate(async (storesArg) => {
    return await new Promise((resolve) => {
      // Wait for the app's Dexie open to land — opening with no version
      // races against the app's own open and can fail.
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve({ ok: false, err: req.error?.message ?? 'open-failed', perStore: {} });
      req.onsuccess = async () => {
        const db = req.result;
        const perStore = {};
        const names = Object.keys(storesArg);
        const available = new Set(Array.from(db.objectStoreNames));
        const writableNames = names.filter((n) => available.has(n));
        if (writableNames.length === 0) {
          db.close();
          resolve({ ok: false, err: 'no-matching-stores', perStore });
          return;
        }
        try {
          const tx = db.transaction(writableNames, 'readwrite');
          let pending = writableNames.length;
          const finish = () => {
            db.close();
            resolve({ ok: true, perStore });
          };
          tx.oncomplete = finish;
          tx.onerror = () => { db.close(); resolve({ ok: false, err: tx.error?.message ?? 'tx-error', perStore }); };
          for (const name of writableNames) {
            const rows = Array.isArray(storesArg[name]) ? storesArg[name] : [];
            const store = tx.objectStore(name);
            let wrote = 0;
            for (const row of rows) {
              try {
                store.put(row);
                wrote += 1;
              } catch {
                // Skip rows with shape mismatches — usually means the
                // export carries an older schema. The store's other
                // rows still land.
              }
            }
            perStore[name] = wrote;
            pending -= 1;
            if (pending === 0) {
              // Last store queued — tx.oncomplete handles resolution.
            }
          }
        } catch (e) {
          db.close();
          resolve({ ok: false, err: e?.message ?? 'unknown', perStore });
        }
      };
    });
  }, stores);

  if (!result.ok) {
    return {
      loaded: false,
      wrote: 0,
      stores: [],
      perStore: result.perStore ?? {},
      skipped: `db-write-failed:${result.err ?? 'unknown'}`,
    };
  }

  const wrote = Object.values(result.perStore).reduce((a, b) => a + b, 0);
  return {
    loaded: true,
    wrote,
    stores: Object.keys(result.perStore),
    perStore: result.perStore,
  };
}
