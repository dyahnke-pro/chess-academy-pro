#!/usr/bin/env node
// The fast commit-time check (David 2026-09-24: "So many push fails dude.
// Isnt there a way to prevent those??").
//
// Every failed push that day was one the 11-minute pre-push ship-check found
// and a ~2-minute check could have found first: a type error in a source file
// the related vitest run passed (vitest does not typecheck), a test asserting a
// moved default. So this runs at COMMIT time, only when TypeScript is staged:
//   • app typecheck (`npm run typecheck`) ‖ test typecheck (tsconfig.tests.json)
//   • eslint on the staged files
//   • the co-located tests of the staged sources + any staged test file
// Red blocks the commit. The push hook then re-confirms on a tree that is
// already green instead of discovering the failure 10 minutes in.
//
// Deliberately NOT `vitest related`: a shared file like CoachTeachPage pulls in
// ~440 test files (~10 min), which is ship-check's job, not a commit's.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf-8' })
  .stdout.split('\n').map((s) => s.trim()).filter(Boolean);
const ts = staged.filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(f));
if (ts.length === 0) process.exit(0);

// Co-located tests: Foo.ts → Foo.test.ts, Foo.*.test.ts in the same directory.
const tests = new Set(ts.filter((f) => /\.test\.tsx?$/.test(f)));
for (const f of ts) {
  if (/\.test\.tsx?$/.test(f)) continue;
  const dir = dirname(f);
  const stem = basename(f).replace(/\.tsx?$/, '');
  for (const name of readdirSync(dir)) {
    if (name.startsWith(`${stem}.`) && /\.test\.tsx?$/.test(name)) tests.add(join(dir, name));
  }
}

function run(label, cmd, args) {
  return new Promise((resolve) => {
    const started = Date.now();
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve({ label, ok: code === 0, out, secs: ((Date.now() - started) / 1000).toFixed(1) }));
  });
}

console.log(`── pre-commit: ${ts.length} TS file(s), ${tests.size} test file(s) ──`);
const jobs = [
  run('typecheck', 'npm', ['run', '-s', 'typecheck']),
  run('test typecheck', 'npx', ['tsc', '-p', 'tsconfig.tests.json', '--noEmit']),
  run('lint (staged)', 'npx', ['eslint', '--quiet', ...ts]),
];
if (tests.size > 0) jobs.push(run('co-located tests', 'npx', ['vitest', 'run', ...tests]));

const results = await Promise.all(jobs);
let failed = false;
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.label} (${r.secs}s)`);
  if (!r.ok) {
    failed = true;
    const lines = r.out.split('\n').filter((l) => /error|FAIL|✗|×|AssertionError/i.test(l));
    console.log((lines.length ? lines : r.out.split('\n')).slice(-25).map((l) => `      ${l}`).join('\n'));
  }
}
if (failed) {
  console.log('✗ pre-commit check failed — commit blocked. Fix the above, or `git commit --no-verify` if you understand the cost.');
  process.exit(1);
}
console.log('✓ pre-commit check green.');
