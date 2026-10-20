/**
 * STALE VITEST TEMP DIRS — swept before every ship-check.
 *
 * THE DISEASE (2026-10-20): every vitest run writes its transformed modules to
 * `<os.tmpdir()>/<nanoid>/client` (~100 MB here) and deletes the folder only on
 * a clean shutdown (`TestProject.clearTmpDir`). A run that is KILLED — a
 * `timeout`, a `pkill`, a stopped ship-check, a harness limit — leaves it
 * behind. Eighty-two of them filled the session's disk allowance, and the next
 * ship-check died in 0.2 s with ENOSPC, reading as two failed gates.
 *
 * The folder is vitest's, not ours, so the fix lives where our runs start: a
 * folder that has vitest's exact shape and has not been written for longer
 * than any run lasts is an orphan of a killed run, and is removed.
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const NANOID = /^[A-Za-z0-9_-]{21}$/;

/** No ship-check run lasts this long; a folder untouched for longer is dead. */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * Folders under `dir` that are a dead vitest run's temp folder: a 21-char
 * nanoid name, holding only `client/`, with neither written in `staleAfterMs`.
 * @param {string} dir
 * @param {number} now  epoch ms
 * @param {number} [staleAfterMs]
 * @returns {string[]}
 */
export function staleVitestTmpDirs(dir, now, staleAfterMs = STALE_AFTER_MS) {
  const out = [];
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (!NANOID.test(name)) continue;
    const path = join(dir, name);
    try {
      if (!statSync(path).isDirectory()) continue;
      const inside = readdirSync(path);
      if (inside.length !== 1 || inside[0] !== 'client') continue;
      const client = join(path, 'client');
      if (!statSync(client).isDirectory()) continue;
      const lastWrite = Math.max(statSync(path).mtimeMs, statSync(client).mtimeMs);
      if (now - lastWrite > staleAfterMs) out.push(path);
    } catch { /* vanished or unreadable: not ours to judge */ }
  }
  return out;
}

/** Remove them; returns how many went. */
export function sweepVitestTmp(dir = tmpdir(), now = Date.now()) {
  let removed = 0;
  for (const path of staleVitestTmpDirs(dir, now)) {
    try { rmSync(path, { recursive: true, force: true }); removed++; } catch { /* keep going */ }
  }
  return removed;
}
