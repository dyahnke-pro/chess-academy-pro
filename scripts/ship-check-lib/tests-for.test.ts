// 🔒 WHAT COVERS THIS FILE — the derivation, gated (2026-09-21).
//
// ship-check answered this by BASENAME (`foo.ts` → `foo.test.ts`) until today.
// `principleAttribution.ts` has eighteen test files and that found one, so when
// the calculation-depth cost gate was rewritten from a 150cp floor to expected
// points the run went green while `section14Diagnosis.test.ts` — which asserts
// the exact decline string that change rewrote — went red on `main` and stayed
// there. It is not in GATE_TESTS and shares no name with its subject, so
// nothing in the repo could see it.
//
// The assertions below are NEGATIVE-CONTROLLED against that old matcher: each
// one re-derives what basename-only would have returned and proves it MISSES
// what the real derivation catches. Without that control this file would pass
// just as happily against the broken logic it exists to replace.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { testsFor, allSourceFiles } from './tests-for.mjs';

/** Exactly what ship-check used to do, kept here as the control. */
function basenameOnly(target: string): string[] {
  const base = target.replace(/\.(ts|tsx)$/, '');
  return [`${base}.test.ts`, `${base}.test.tsx`].filter((t) => existsSync(t));
}

const SUBJECT = 'src/services/principleAttribution.ts';

describe('testsFor — one derivation of what covers a source file', () => {
  it('reaches a test that only IMPORTS the subject, sharing no name with it', () => {
    const got = testsFor(SUBJECT);
    // The file that actually went red, found by import and by nothing else.
    expect(got).toContain('src/services/section14Diagnosis.test.ts');
    // NEGATIVE CONTROL — the matcher this replaced cannot see it.
    expect(basenameOnly(SUBJECT)).not.toContain('src/services/section14Diagnosis.test.ts');
  });

  it('reaches sibling tests named after the subject but not equal to it', () => {
    const got = testsFor(SUBJECT);
    for (const sibling of [
      'src/services/principleAttribution.section14.test.ts',
      'src/services/principleAttributionEndgame.test.ts',
      'src/services/principleAttributionEvalPv.test.ts',
    ]) {
      expect(got, `${sibling} covers the subject and must be run when it changes`).toContain(sibling);
      expect(basenameOnly(SUBJECT), 'negative control').not.toContain(sibling);
    }
  });

  it('finds MANY more than the basename matcher on a hot file', () => {
    // The shape of the defect in one number: 18 vs 1.
    expect(testsFor(SUBJECT).length).toBeGreaterThan(basenameOnly(SUBJECT).length + 5);
  });

  it('returns only test files, and only ones that exist', () => {
    const got = testsFor(SUBJECT);
    expect(got.length, 'non-vacuous — an empty result would satisfy every assertion below').toBeGreaterThan(0);
    for (const t of got) {
      expect(t, `${t} is not a test file`).toMatch(/\.test\.tsx?$/);
      expect(existsSync(t), `${t} does not exist`).toBe(true);
    }
  });

  it('is non-vacuous: the file walk actually finds the repo', () => {
    // A broken walk would make every testsFor() return [] and this whole file
    // pass for free — the exact failure mode this gate exists to name.
    const all = allSourceFiles();
    expect(all.length).toBeGreaterThan(500);
    expect(all).toContain(SUBJECT);
  });

  it('a file with no tests returns an empty list rather than throwing', () => {
    expect(testsFor('src/services/__nonexistent_surface__.ts')).toEqual([]);
  });
});
