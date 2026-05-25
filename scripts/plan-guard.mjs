#!/usr/bin/env node
// PLAN.md clobber guard (David 2026-05-25).
//
// CLAUDE.md treats root PLAN.md as ONE rolling living doc: "append-and-
// update; archive to docs/plans/<date>-<topic>.md when a major chunk lands
// and a new plan starts." The risk (a real near-miss): a session overwrites
// PLAN.md wholesale WITHOUT archiving the prior plan first, so the only
// recovery is `git log`. Parallel sessions make this worse.
//
// This guard runs as a pre-commit hook. When the staged change to PLAN.md
// looks like a WHOLESALE REPLACEMENT (most of the prior plan deleted) AND
// the same commit does NOT also add/update a file under docs/plans/ (the
// archive), it blocks with a clear message. Append-and-update edits (the
// normal case) pass untouched.
//
// Bypass on a specific commit (RARE): `git commit --no-verify`.

import { execSync } from 'node:child_process';

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// Thresholds: a "wholesale replacement" deletes a lot of the prior plan,
// both in absolute terms and as a fraction of the old file. Tuned to let
// normal append/update edits (and small reorganizations) through.
const MIN_DELETED_LINES = 30;
const MIN_DELETED_FRACTION = 0.5;

const staged = sh('git diff --cached --name-only').split('\n').filter(Boolean);
if (!staged.includes('PLAN.md')) process.exit(0); // PLAN.md not touched — nothing to guard.

// New PLAN.md (no prior version) — first plan, nothing to clobber.
const prior = sh('git show HEAD:PLAN.md');
if (!prior) process.exit(0);
const priorLines = prior.split('\n').length;

// Lines removed from PLAN.md in this commit (numstat: "added removed path").
const numstat = sh('git diff --cached --numstat -- PLAN.md');
const removed = Number(numstat.split('\t')[1] ?? '0') || 0;

const isWholesale =
  removed >= MIN_DELETED_LINES && removed >= priorLines * MIN_DELETED_FRACTION;
if (!isWholesale) process.exit(0); // append/update — fine.

// A wholesale replacement is only allowed alongside an archive write.
const archivedThisCommit = staged.some((f) => f.startsWith('docs/plans/'));
if (archivedThisCommit) process.exit(0);

console.error('');
console.error('✗ PLAN.md clobber guard');
console.error(`  This commit replaces PLAN.md wholesale (${removed} of ~${priorLines} lines removed)`);
console.error('  but does NOT archive the prior plan.');
console.error('');
console.error('  CLAUDE.md: PLAN.md is one rolling doc — archive the current plan to');
console.error('  docs/plans/<date>-<topic>.md and stage it in the SAME commit before');
console.error('  starting a new plan. This protects parallel sessions’ work.');
console.error('');
console.error('  To proceed anyway (rare — you understand the cost): git commit --no-verify');
console.error('');
process.exit(1);
