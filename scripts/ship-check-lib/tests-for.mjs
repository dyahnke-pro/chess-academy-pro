/**
 * testsFor — WHICH TESTS COVER A SOURCE FILE. One derivation, two readers.
 *
 * THE DEFECT THIS EXISTS TO CLOSE (found 2026-09-21). ship-check mapped a
 * changed source file to its tests BY BASENAME:
 *
 *     const base = f.replace(/\.(ts|tsx)$/, '');
 *     for (const t of [`${base}.test.ts`, `${base}.test.tsx`]) ...
 *
 * `principleAttribution.ts` has EIGHTEEN test files. That mapping found ONE.
 * So on 2026-09-21 the calculation-depth cost gate was rewritten from a raw
 * 150cp floor to expected points, `principleAttribution.test.ts` passed,
 * ship-check printed READY TO PUSH, and `section14Diagnosis.test.ts` — which
 * asserts the exact decline string that change rewrote — went red on `main`
 * and stayed there. Nothing could have caught it: that file is not in
 * GATE_TESTS and does not share the basename.
 *
 * A gate that cannot fire is worse than no gate, because it reports green.
 *
 * WHY IT LIVES HERE AND NOT IN ship-check.mjs: `surface-map.mjs` ALREADY
 * derived the true list — by prefix AND by import — to print the "## Tests"
 * section of every surface map. Writing a second, better basename matcher in
 * ship-check would have been the duplicated-judgement the rot rule bans: two
 * answers to "what covers this file", drifting apart, with the stricter one
 * losing silently. Both now read this.
 *
 * TWO REACHES, because either alone misses real coverage:
 *   • PREFIX  — `principleAttribution.ts` → `principleAttributionEndgame.test.ts`,
 *     `principleAttribution.section14.test.ts`. Named after the subject, no import
 *     needed to be obvious.
 *   • IMPORT  — `section14Diagnosis.test.ts` imports `./principleAttribution`
 *     and shares no name with it at all. This is the one the basename mapping
 *     could never see, and the one that went red.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let FILE_CACHE = null;
/** Every source file in the repo, once. */
export function allSourceFiles() {
  if (FILE_CACHE) return FILE_CACHE;
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(REPO, dir), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(rel);
    }
  };
  for (const root of ['src', 'scripts', 'api']) {
    if (existsSync(join(REPO, root))) walk(root);
  }
  FILE_CACHE = out.sort();
  return FILE_CACHE;
}

const readCache = new Map();
export function read(p) {
  if (!readCache.has(p)) {
    try { readCache.set(p, readFileSync(join(REPO, p), 'utf-8')); } catch { readCache.set(p, ''); }
  }
  return readCache.get(p);
}

/**
 * Test files covering `target` — by filename prefix, or by importing it.
 *
 * `target` is repo-relative (`src/services/principleAttribution.ts`).
 * Returns repo-relative test paths, sorted, deduped.
 */
export function testsFor(target) {
  const base = basename(target, extname(target));
  const dir = dirname(target);
  return allSourceFiles().filter((f) =>
    /\.test\.tsx?$/.test(f)
    && (f.startsWith(`${dir}/${base}`)
      || read(f).includes(`/${base}'`)
      || read(f).includes(`./${base}'`)));
}
