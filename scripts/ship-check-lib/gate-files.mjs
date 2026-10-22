// WHICH TEST FILES ARE GATES — found by NAME and by PLACE, never by a list.
//
// 🔴 THE DEFECT (2026-10-22). ship-check ran a hand-written GATE_TESTS list
// plus the tests of the files a change touched. A gate that sits in
// `src/test/` guards the WHOLE repo, so it sits beside no source file and the
// changed-file step never finds it; and a list only knows the gates someone
// remembered to add. 43 `*.gate.test.ts` files and 41 other `src/test/` gates
// were in neither, so code that broke them shipped green: three were broken by
// one build, and `oneNullMove.gate.test.ts` sat red on `main`.
//
// So a gate is DECLARED by where it lives or what it is called, and ship-check
// reads the declaration:
//   1. any `*.gate.test.ts(x)` under src/, api/ or scripts/ — the name says so;
//   2. any test file under `src/test/` — the repo-level test folder holds the
//      repo-wide invariants (a unit test of one module is co-located with it).
// A new gate is picked up the day it is written, with no edit here.
//
// Two honest exceptions, both by rule rather than by name:
//   - `src/test/benchmarks/**` — opt-in perf suite, excluded by vitest.config;
//   - `*.measure.test.ts(x)` — opt-in measurements that run only when their env
//     label is set (`it.runIf(LABEL)`), so in ship-check they would skip.
// Anything else in `src/test/` that is NOT a gate is named in NOT_GATES with
// its reason, and `gate-files.test.ts` fails on a file that is in neither set.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const GATE_ROOTS = ['src', 'api', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', 'dist', 'audit-reports']);

/** Repo-level test files that are NOT gates, each with the reason. Shrink it; never park a red gate here. */
export const NOT_GATES = {
  'src/test/infrastructure.test.ts':
    'unit test of the test factories (src/test/factories.ts); the changed-file step runs it when factories.ts changes',
};

const isTest = (f) => /\.test\.tsx?$/.test(f);
export const isGateByName = (f) => /\.gate\.test\.tsx?$/.test(f);
export const isOptIn = (f) => f.startsWith('src/test/benchmarks/') || /\.measure\.test\.tsx?$/.test(f);
export const isRepoLevelTest = (f) => f.startsWith('src/test/') && isTest(f);

/** Is this repo-relative path a gate ship-check must run? */
export function isGateFile(f) {
  if (!isTest(f) || isOptIn(f)) return false;
  if (isGateByName(f)) return true;
  return isRepoLevelTest(f) && !Object.prototype.hasOwnProperty.call(NOT_GATES, f);
}

/** Every test file under the gate roots, repo-relative, sorted. */
export function listTestFiles(repoRoot) {
  const out = [];
  const walk = (rel) => {
    let names;
    try { names = readdirSync(join(repoRoot, rel)); } catch { return; }
    for (const name of names) {
      if (SKIP_DIRS.has(name)) continue;
      const p = rel ? `${rel}/${name}` : name;
      let st;
      try { st = statSync(join(repoRoot, p)); } catch { continue; }
      if (st.isDirectory()) walk(p);
      else if (isTest(p)) out.push(p);
    }
  };
  for (const root of GATE_ROOTS) walk(root);
  return out.sort();
}

/** The gate files found on disk — the set ship-check runs beside its curated list. */
export function discoverGateFiles(repoRoot) {
  return listTestFiles(repoRoot).filter(isGateFile);
}
