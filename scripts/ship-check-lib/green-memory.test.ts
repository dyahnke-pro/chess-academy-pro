import { describe, it, expect } from 'vitest';
import { STEP_READS, stepNeedsRun, pickTests } from './green-memory.mjs';

type Reads = (f: string) => boolean;
const reads = STEP_READS as { typecheck: Reads; testTypecheck: Reads; build: Reads };

describe('ship-check green memory — a step is reused only when nothing it reads changed', () => {
  it('re-runs everything with no baseline', () => {
    expect(stepNeedsRun(null, reads.typecheck)).toBe(true);
  });

  it('reuses typecheck and the build when only tests/docs changed (the retry that cost an hour)', () => {
    const since = ['src/hooks/hintDialTally.test.ts', 'docs/surface-maps/x.md', 'docs/STATE.md'];
    expect(stepNeedsRun(since, reads.typecheck)).toBe(false);
    expect(stepNeedsRun(since, reads.build)).toBe(false);
    // …but a test file IS what the test typecheck reads.
    expect(stepNeedsRun(since, reads.testTypecheck)).toBe(true);
  });

  it('re-runs every step when app source or the toolchain changed', () => {
    for (const f of ['src/services/coachDecider.ts', 'package.json', 'tsconfig.app.json', 'vite.config.ts']) {
      expect(stepNeedsRun([f], reads.typecheck), f).toBe(true);
      expect(stepNeedsRun([f], reads.build), f).toBe(true);
      expect(stepNeedsRun([f], reads.testTypecheck), f).toBe(true);
    }
    expect(stepNeedsRun(['api/tts.ts'], reads.typecheck)).toBe(true);
    expect(stepNeedsRun(['public/data/x.json'], reads.build)).toBe(true);
  });
});

describe('ship-check green memory — per test file', () => {
  const deps: Record<string, string[]> = { 'src/a.ts': ['src/a.test.ts'], 'src/b.ts': ['src/b.test.ts'] };
  const base = {
    readsSource: () => false,
    dependsOn: (t: string, f: string) => (deps[f] ?? []).includes(t),
  };
  const tests = ['src/a.test.ts', 'src/b.test.ts', 'src/c.test.ts'];

  it('runs a file with no green baseline (first run, or it failed last time)', () => {
    expect(pickTests(tests, { ...base, sinceFor: () => null })).toEqual(tests);
  });

  it('re-runs only the tests of what changed', () => {
    expect(pickTests(tests, { ...base, sinceFor: () => ['src/a.ts'] })).toEqual(['src/a.test.ts']);
  });

  it('re-runs a test whose own file changed', () => {
    expect(pickTests(tests, { ...base, sinceFor: () => ['src/c.test.ts'] })).toEqual(['src/c.test.ts']);
  });

  it('re-runs everything when a shared helper or the toolchain changed', () => {
    expect(pickTests(tests, { ...base, sinceFor: () => ['src/test/factories.ts'] })).toEqual(tests);
    expect(pickTests(tests, { ...base, sinceFor: () => ['vitest.config.ts'] })).toEqual(tests);
  });

  it('a test that reads source from disk re-runs on ANY change — its dependency is invisible to imports', () => {
    const r = pickTests(tests, { ...base, readsSource: (t: string) => t === 'src/c.test.ts', sinceFor: () => ['docs/STATE.md'] });
    expect(r).toEqual(['src/c.test.ts']);
  });

  it('reuses a file when nothing changed since it passed', () => {
    expect(pickTests(tests, { ...base, sinceFor: () => [] })).toEqual([]);
  });
});
