// green-memory — SHIP-CHECK REMEMBERS WHAT ALREADY PASSED (David 2026-09-24:
// "You NEED TO FIGURE THIS SHIT OUT!! LOCK THIS IN FOR FUTURE SESSIONS").
//
// One build took five push attempts and about an hour: each attempt ran the
// full 11-minute check, found ONE failing test, and the fix — often a single
// test file — then paid the whole 11 minutes again, re-proving typecheck, the
// prod build and ~300 test files that nothing had touched.
//
// So each step records the working TREE it went green on (a git tree object of
// the whole working copy, tracked + untracked, via a scratch index). On the
// next run a step is skipped when no file it READS changed since that tree;
// test steps go further and remember each test FILE, so a retry re-runs only
// the files that failed plus those touching what changed.
//
// SAFETY, stated so nobody widens it: a step is reused only when the diff
// since its green tree is PROVABLY outside what it reads. Anything unknown
// (no tree, git failure, a config file) re-runs. A test that reads source
// from disk (`readFileSync`) re-runs on ANY change, because its dependency
// is invisible to the import graph. `SHIP_CHECK_NO_CACHE=1` or `--no-cache`
// turns all of this off.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = 1;

// ── What each step READS. A change outside these cannot change its verdict. ──
const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || f.startsWith('src/test/');
const isToolchain = (f) => /^(package(-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.ts|vitest\.config\.ts|eslint\.config\.[a-z]+)$/.test(f);

export const STEP_READS = {
  /** `tsc -b` over tsconfig.app (src minus tests) + tsconfig.node (vite config, api). */
  typecheck: (f) => isToolchain(f) || (f.startsWith('src/') && !isTest(f)) || f.startsWith('api/'),
  /** tsconfig.tests.json includes all of src. */
  testTypecheck: (f) => isToolchain(f) || f.startsWith('src/'),
  /** The vite build: app source, static assets, the HTML shell. */
  build: (f) => isToolchain(f) || (f.startsWith('src/') && !isTest(f)) || f.startsWith('public/') || f === 'index.html',
};

/** True when the step must run: no baseline, or a file it reads changed. */
export function stepNeedsRun(since, reads) {
  if (since === null) return true;
  return since.some((f) => reads(f));
}

/**
 * Which test files must run. A test is reused only when it passed at a
 * known tree and nothing it depends on changed since:
 *  - its own file, a shared test helper, or the toolchain changed → run;
 *  - it reads source from disk → run on ANY change;
 *  - a changed source file lists it among its tests (`dependsOn`) → run.
 */
export function pickTests(tests, { sinceFor, readsSource, dependsOn }) {
  return tests.filter((t) => {
    const since = sinceFor(t);
    if (since === null) return true;
    if (since.length === 0) return false;
    if (readsSource(t)) return true;
    return since.some((f) => f === t || f.startsWith('src/test/') || isToolchain(f) || dependsOn(t, f));
  });
}

// ── IO ────────────────────────────────────────────────────────────────────
export function createGreenMemory({ repoRoot, logDir, disabled }) {
  const file = join(logDir, 'green.json');
  let state = { version: VERSION, steps: {}, tests: {} };
  if (!disabled) {
    try {
      const prev = JSON.parse(readFileSync(file, 'utf-8'));
      if (prev.version === VERSION) state = prev;
    } catch { /* first run */ }
  }

  /** A git tree of the WHOLE working copy, without touching the real index. */
  function snapshotTree() {
    const gitIndex = spawnSync('git', ['rev-parse', '--git-path', 'index'], { cwd: repoRoot, encoding: 'utf-8' });
    if (gitIndex.status !== 0) return null;
    const tmp = join(logDir, `index-${process.pid}`);
    try {
      mkdirSync(logDir, { recursive: true });
      copyFileSync(join(repoRoot, gitIndex.stdout.trim()), tmp);
    } catch { return null; }
    const env = { ...process.env, GIT_INDEX_FILE: tmp };
    const add = spawnSync('git', ['add', '-A'], { cwd: repoRoot, env });
    const tree = add.status === 0 ? spawnSync('git', ['write-tree'], { cwd: repoRoot, env, encoding: 'utf-8' }) : null;
    try { unlinkSync(tmp); } catch { /* best effort */ }
    return tree?.status === 0 ? tree.stdout.trim() : null;
  }

  const tree = disabled ? null : snapshotTree();
  const diffs = new Map();
  /** Files changed between a recorded green tree and now; null = unknown. */
  function changedSince(prevTree) {
    if (!tree || !prevTree) return null;
    if (prevTree === tree) return [];
    if (diffs.has(prevTree)) return diffs.get(prevTree);
    const r = spawnSync('git', ['diff', '--name-only', prevTree, tree], { cwd: repoRoot, encoding: 'utf-8' });
    const out = r.status === 0 ? r.stdout.split('\n').filter(Boolean) : null;
    diffs.set(prevTree, out);
    return out;
  }

  const readsSourceCache = new Map();
  function readsSource(testFile) {
    if (!readsSourceCache.has(testFile)) {
      let v = true;
      try { v = /readFileSync|readdirSync|fs\/promises/.test(readFileSync(join(repoRoot, testFile), 'utf-8')); } catch { /* unknown → run */ }
      readsSourceCache.set(testFile, v);
    }
    return readsSourceCache.get(testFile);
  }

  function save() {
    if (disabled || !tree) return;
    try { mkdirSync(logDir, { recursive: true }); writeFileSync(file, JSON.stringify(state) + '\n'); } catch { /* best effort */ }
  }

  return {
    tree,
    enabled: !disabled && !!tree,
    stepSince: (key) => changedSince(state.steps[key]),
    testSince: (t) => changedSince(state.tests[t]),
    readsSource,
    markStep(key, ok) { if (!tree) return; if (ok) state.steps[key] = tree; else delete state.steps[key]; save(); },
    markTests(passed, failed) {
      if (!tree) return;
      for (const t of passed) state.tests[t] = tree;
      for (const t of failed) delete state.tests[t];
      save();
    },
  };
}
