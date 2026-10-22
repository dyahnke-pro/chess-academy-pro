// 🔒 SHIP-CHECK RUNS EVERY GATE — the discovery, gated (2026-10-22).
//
// ship-check used to run a hand-written list plus the tests of changed files,
// and 73 gates were in neither: every `src/test/` gate (they guard the whole
// repo, so they sit beside no source file) and every `*.gate.test.ts` nobody
// had listed. `oneNullMove.gate.test.ts` sat red on `main` because of it.
//
// The enumeration here is INDEPENDENT of the walker under test (it asks git,
// not the file system walk), so a walker that stops descending into a folder
// fails this file instead of agreeing with itself. And the wiring is checked by
// STATEMENT: discovery that ship-check never hands to vitest is a wire that
// does not fire.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { discoverGateFiles, isGateFile, NOT_GATES, GATE_ROOTS } from './gate-files.mjs';

const REPO = process.cwd();

/** Every tracked test file under the gate roots, from git — not from the walker. */
function trackedTests(): string[] {
  const r = spawnSync('git', ['ls-files', ...GATE_ROOTS], { cwd: REPO, encoding: 'utf-8' });
  expect(r.status, `git ls-files failed: ${r.stderr}`).toBe(0);
  return r.stdout.split('\n').filter((f) => /\.test\.tsx?$/.test(f));
}

describe('ship-check finds every gate by name and by place', () => {
  const found = new Set(discoverGateFiles(REPO));
  const tracked = trackedTests();

  it('the enumeration is not vacuous', () => {
    expect(tracked.length).toBeGreaterThan(500);
    expect(found.size).toBeGreaterThan(80);
    // Two gates that went unrun before this file existed — one by name, one by place.
    expect(found.has('src/test/oneNullMove.gate.test.ts')).toBe(true);
    expect(found.has('src/test/oneDevelopmentReading.test.ts')).toBe(true);
  });

  it('every *.gate.test file anywhere is run', () => {
    const missed = tracked.filter((f) => /\.gate\.test\.tsx?$/.test(f) && !found.has(f));
    expect(missed, 'a file named as a gate that ship-check would not run').toEqual([]);
  });

  it('every src/test test is run, opt-in, or named in NOT_GATES with a reason', () => {
    const unaccounted = tracked.filter((f) => f.startsWith('src/test/')
      && !found.has(f)
      && !f.startsWith('src/test/benchmarks/')
      && !/\.measure\.test\.tsx?$/.test(f)
      && !(f in NOT_GATES));
    expect(unaccounted).toEqual([]);
  });

  it('NOT_GATES names real files, each with a reason, and never a named gate', () => {
    for (const [f, why] of Object.entries(NOT_GATES)) {
      expect(existsSync(f), `${f} is listed in NOT_GATES but does not exist`).toBe(true);
      expect(why.length, `${f} needs a reason`).toBeGreaterThan(20);
      expect(/\.gate\.test\./.test(f), `${f} is named a gate — it cannot be parked`).toBe(false);
    }
  });

  it('a new gate is picked up the day it is written, with no edit to ship-check (negative controls)', () => {
    expect(isGateFile('src/services/brandNewRule.gate.test.ts')).toBe(true);
    expect(isGateFile('api/brandNewRule.gate.test.ts')).toBe(true);
    expect(isGateFile('src/test/brandNewInvariant.test.ts')).toBe(true);
    expect(isGateFile('src/test/nested/brandNewInvariant.test.tsx')).toBe(true);
    // Not gates: a co-located unit test, the opt-in perf suite, an opt-in measurement.
    expect(isGateFile('src/services/brandNewThing.test.ts')).toBe(false);
    expect(isGateFile('src/test/benchmarks/engine.perf.test.ts')).toBe(false);
    expect(isGateFile('src/test/census.measure.test.ts')).toBe(false);
    expect(isGateFile('src/test/setup.ts')).toBe(false);
  });

  it('ship-check hands the discovered gates to vitest', () => {
    const src = readFileSync('scripts/ship-check.mjs', 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const DISCOVERED_GATES = discoverGateFiles\(REPO_ROOT\)/);
    expect(src).toMatch(/const ALL_GATES = \[\.\.\.new Set\(\[\.\.\.GATE_TESTS, \.\.\.DISCOVERED_GATES\]\)\]/);
    expect(src).toMatch(/runTestFiles\('content gates', ALL_GATES\)/);
    // The changed-file step must not re-run a gate the gate step already ran.
    expect(src).toMatch(/filter\(\(t\) => !ALL_GATES\.includes\(t\)\)/);
  });
});
