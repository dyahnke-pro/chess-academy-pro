/**
 * Importing `loadFullCorpus` is not the same as calling it.
 *
 * `src/test/loadFullCorpus.ts` exports a FUNCTION and does nothing at import
 * time. So `import '../test/loadFullCorpus';` — a side-effect-only import —
 * primes NOTHING, while looking exactly like the line that would. Four gates
 * carried that line and were green against 19.6% of the corpus:
 *
 *   danya         8,162  static   ← visible
 *   chessbrah     2,766  static   ← visible
 *   the rest     52,802  fetched  ← INVISIBLE without the call
 *
 * Worse since 2026-08-26, when the anchored farmed notes were archived: the two
 * static corpora ship FLOATING-ONLY, so any exact-position assertion in an
 * unprimed file is querying an index that cannot contain a hit. That is how
 * `notePreferReachable` came to report 0 notes across 1,310 plies.
 *
 * The helper's own header warned about this — "a gate written without it passes
 * while testing a fifth of the data" — and four gates fell into it anyway,
 * because the failure is INVISIBLE: no error, no empty result, just a smaller
 * number that nothing compares against. A comment cannot catch that. This can.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');

function testFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) testFiles(p, out);
    else if (/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('loadFullCorpus is called, not merely imported', () => {
  const files = testFiles(join(ROOT, 'src'));

  it('finds the test tree (guards the guard)', () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it('no test imports it for side effects only', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      if (f.endsWith('loadFullCorpusIsCalled.test.ts')) continue; // this file names it in prose
      if (!src.includes('loadFullCorpus')) continue;
      // A bare `import '…/loadFullCorpus';` with no binding list primes nothing.
      const sideEffectOnly = /^\s*import\s+['"][^'"]*loadFullCorpus['"]\s*;/m.test(src);
      const calls = /\bloadFullCorpus\s*\(/.test(src);
      if (sideEffectOnly || !calls) {
        offenders.push(`${f.replace(`${ROOT}/`, '')}${sideEffectOnly ? ' (side-effect import)' : ' (imported, never called)'}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('callers WITHOUT a non-vacuity floor only ever shrink', () => {
    // Calling it is not quite enough: if `public/data/*.json` is missing the
    // loader returns empty bundles BY DESIGN — a missing file is a real signal,
    // and the CALLER's assertion is what surfaces it. Without one, a gate is
    // back to measuring an empty index by a different route.
    //
    // Not absolute, deliberately. 11 of the 29 callers are `.report.test.ts`
    // generators whose job is to WRITE a number, not to gate on one, and
    // demanding one exact idiom of them would be churn dressed as rigour. So
    // this is a shrink-only baseline: the debt is visible, it can only go down,
    // and a NEW caller cannot be added without a floor.
    // BLAME BY STATEMENT, NOT BY PROXIMITY. Two of the files this used to
    // count are not callers at all: `src/test/loadFullCorpus.ts` matched its
    // OWN `export function loadFullCorpus(` — a definition is not a call —
    // and `loadSpokenBake.ts` matched a COMMENT that merely mentions calling
    // it. That is the same first-cut mistake the perspective gate made and
    // recorded (four innocent files blamed for describing the rule), so the
    // fix is the same: strip comments, and never blame the module that
    // defines the thing.
    const callers = files.filter((f) => {
      if (f.endsWith(join('src', 'test', 'loadFullCorpus.ts'))) return false;
      const code = readFileSync(f, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      return /\bloadFullCorpus\s*\(/.test(code);
    });
    expect(callers.length).toBeGreaterThan(20); // the walk found them
    const noFloor = callers.filter((f) => !/toBeGreaterThan\(\s*(?:20_000|20000|\d{5,})/.test(readFileSync(f, 'utf-8')));
    expect(noFloor.length, noFloor.map((f) => f.replace(`${ROOT}/`, '')).join(', ')).toBeLessThanOrEqual(24);
  });
});
