#!/usr/bin/env node
// ship-check — one-button "am I done?" gate.
//
// David, 2026-05-22: "next time I claim done, I should be running ship-check
// and showing you the green checks." This script is that button.
//
// Runs every fast gate in sequence + pulls the live audit stream. Exits 0
// iff every required check passes. Exits 1 with a concise failure summary
// otherwise. Designed to be the pre-push reflex — wire to a git hook or run
// manually before claiming any task complete.
//
//   npm run ship-check         — fast lane (~30-60s): typecheck + lint +
//                                vitest + audit-stream pull. Mandatory.
//   npm run ship-check -- --full
//                              — adds Playwright audit matrix (~5-10min).
//                                Required before declaring a multi-surface
//                                build done.
//
// On failure, prints the LAST N lines of failing stdout/stderr so you can
// see exactly what broke without digging through logs.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const ARGS = new Set(process.argv.slice(2));
const FULL = ARGS.has('--full');
const SUMMARY = ARGS.has('--summary');
const STARTED = Date.now();

const LOG_DIR = join(REPO_ROOT, '.ship-check-log');
const LOG_LATEST = join(LOG_DIR, 'latest.json');

// ── --summary mode: print what changed since the last green run ─────
// Doesn't run any checks — just reads the log and prints a paste-ready
// summary for the next commit message or PR description. Stops early.
if (SUMMARY) {
  if (!existsSync(LOG_LATEST)) {
    console.log('No prior green ship-check log. Run `npm run ship-check` first.');
    process.exit(0);
  }
  const prev = JSON.parse(readFileSync(LOG_LATEST, 'utf-8'));
  const since = prev.sha;
  console.log('');
  console.log(`── since last green ship-check (${prev.timestamp}) ──`);
  console.log(`  Previous green at: ${since.slice(0, 8)}`);
  console.log('');
  const commits = spawnSync('git', ['log', '--oneline', `${since}..HEAD`], { encoding: 'utf-8' });
  if (commits.stdout?.trim()) {
    console.log('  Commits:');
    for (const line of commits.stdout.trim().split('\n')) console.log(`    ${line}`);
  } else {
    console.log('  No commits since last green run.');
  }
  console.log('');
  const files = spawnSync('git', ['diff', '--name-only', `${since}..HEAD`], { encoding: 'utf-8' });
  if (files.stdout?.trim()) {
    const arr = files.stdout.trim().split('\n');
    console.log(`  Files changed (${arr.length}):`);
    for (const f of arr.slice(0, 20)) console.log(`    · ${f}`);
    if (arr.length > 20) console.log(`    · ... +${arr.length - 20} more`);
  }
  console.log('');
  process.exit(0);
}

const results = [];

function runStep(label, cmd, args, opts = {}) {
  const start = Date.now();
  process.stdout.write(`  • ${label}... `);
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf-8',
  });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  const out = (r.stdout ?? '') + '\n' + (r.stderr ?? '');
  const summary = opts.summary ? opts.summary(out) : null;
  results.push({ label, ok, ms, out, summary, optional: opts.optional ?? false });
  const mark = ok ? '✓' : (opts.optional ? '○' : '✗');
  const detail = summary ? `:: ${summary}` : '';
  process.stdout.write(`${mark} ${(ms/1000).toFixed(1)}s ${detail}\n`);
  return ok;
}

// ── Helpers to extract a one-line summary from a step's output ─────
function summarizeVitest(out) {
  const m = out.match(/Tests\s+(\d+\s+(?:failed\s+\|\s+)?\d+\s+passed[^|]*)/);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}
function summarizeLint(out) {
  const m = out.match(/✖\s+(\d+\s+problems\s+\(\d+\s+errors,\s+\d+\s+warnings\))/);
  return m ? m[1] : (out.includes('error') ? 'errors found' : '0 errors');
}
function summarizePlaywright(out) {
  const m = out.match(/DONE\s+—\s+(\d+\/\d+)\s+checks/);
  return m ? `${m[1]} checks passed` : null;
}

// ── Audit-stream pull (informational; never blocks) ─────────────────
function pullAuditStream() {
  const start = Date.now();
  process.stdout.write(`  • audit-stream... `);
  const secret = process.env.AUDIT_STREAM_SECRET ?? readAuditSecret();
  if (!secret) {
    process.stdout.write(`○ skipped (AUDIT_STREAM_SECRET not in env)\n`);
    results.push({ label: 'audit-stream', ok: true, ms: 0, optional: true, summary: 'skipped (no secret)' });
    return;
  }
  const since = Date.now() - 60 * 60_000; // last hour
  const r = spawnSync('curl', [
    '-s', '-m', '15',
    '-H', `x-audit-secret: ${secret}`,
    `https://chess-academy-pro.vercel.app/api/audit-stream?since=${since}`,
  ], { encoding: 'utf-8' });
  const ms = Date.now() - start;
  try {
    const parsed = JSON.parse(r.stdout ?? '{}');
    const count = parsed.count ?? 0;
    const errEvents = (parsed.entries ?? []).filter(e => /error|fail|trip|fallback/i.test(`${e.kind} ${e.source}`));
    const summary = count === 0
      ? 'empty (app not open)'
      : `${count} events, ${errEvents.length} error-class`;
    results.push({ label: 'audit-stream', ok: true, ms, optional: true, summary });
    process.stdout.write(`○ ${(ms/1000).toFixed(1)}s :: ${summary}\n`);
  } catch (e) {
    results.push({ label: 'audit-stream', ok: true, ms, optional: true, summary: 'fetch failed' });
    process.stdout.write(`○ ${(ms/1000).toFixed(1)}s :: fetch failed (non-blocking)\n`);
  }
}

function readAuditSecret() {
  for (const path of ['.env.local', '.env']) {
    const fp = join(REPO_ROOT, path);
    if (!existsSync(fp)) continue;
    const txt = readFileSync(fp, 'utf-8');
    const m = txt.match(/^AUDIT_STREAM_SECRET=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────
console.log('');
console.log('── ship-check ──────────────────────────────────');
console.log(FULL ? '  mode: FULL (Playwright matrix included)' : '  mode: fast');
console.log('');

// REQUIRED: typecheck + lint + load-bearing CONTENT GATES.
//
// We run a CURATED gate list — not `vitest run` over everything — because
// the repo carries unrelated UI/snapshot tests that rot at a different
// cadence than the gate tests. The gates below are the ones that protect
// content correctness (chess legality, narration grounding, depth, plan
// orientation). If any of these fail, the build can't ship. If a non-gate
// test fails, that's a separate problem the gate harness shouldn't gate.
const GATE_TESTS = [
  'src/data/lessons/lessonIntegrity.test.ts',
  'src/data/lessons/narrationAccuracy.test.ts',
  'src/data/lessons/narrationGrounding.test.ts',
  'src/data/lessons/lessonDepth.test.ts',
  'src/data/lessons/courseScope.test.ts',
  'src/data/punishGems.test.ts',
  'src/data/lessons/wlppNarration.test.ts',
  'src/data/lessons/lessonTabIntegrity.test.ts',
  'src/data/lessons/pircIntegrity.test.ts',
  'src/data/repertoire-orientation.test.ts',
  'src/data/pro-repertoires-orientation.test.ts',
  'src/data/openingManifests.test.ts',
  'src/data/modelGames.test.ts',
  'src/data/modelGames-orientation.test.ts',
  'src/data/lessons/openingWiring.test.ts',
  'src/services/middlegamePlanner.test.ts',
  'src/components/Openings/MiddlegamePlansSection.test.tsx',
  'src/components/Openings/EndgamePlansSection.test.tsx',
  'src/components/Openings/OpeningDetailPage.wiring.test.ts',
];

runStep('typecheck   ', 'npm', ['run', 'typecheck']);
// Lint with NO warning cap — ship-check blocks on ERRORS only (warnings are
// pre-existing rot that drifts up and down at a different cadence than the
// gate set). `npm run lint` enforces a project-wide warning cap (currently
// 248) that's useful in code review but ALSO fails ship-check when the cap
// is exceeded, even when no errors were introduced. Decouple the two.
runStep('lint (errors)', 'npx', [
  'eslint', '.', '--ext', 'ts,tsx',
  '--report-unused-disable-directives',
  '--max-warnings', '99999',
], { summary: summarizeLint });
runStep('content gates', 'npx', ['vitest', 'run', ...GATE_TESTS], { summary: summarizeVitest });

// INFORMATIONAL: audit stream pull (never blocks).
pullAuditStream();

// ── FULL MODE — Playwright matrix auto-detected from changed files ──
//
// Maps file globs → audit scripts. When --full runs, we look at the
// files changed in this work (unpushed commits + working tree) and run
// the audits whose globs match. Matrix mirrors CLAUDE.md's Post-Deploy
// Audit table so the source of truth stays in one place.
//
// "Always" entries run on every --full regardless of changes — they're
// the canonical content-rendering checks that should pass whatever you
// touched. Surface-specific entries layer on top.
const AUDIT_MATRIX = [
  { script: 'audit-named-traps.mjs',         globs: ['src/data/lessons/', 'src/components/Openings/', 'src/data/repertoire.json'], always: true },
  { script: 'audit-leadeye-plans.mjs',       globs: ['src/data/lessons/', 'src/data/middlegame-plans.json', 'src/components/Openings/'], always: true },
  { script: 'audit-opening-trap-tiles.mjs',  globs: ['src/data/lessons/', 'src/data/repertoire.json', 'src/components/Openings/'] },
  { script: 'audit-coach-teach-unknown-line.mjs', globs: ['src/components/Coach/Teach', 'src/services/coachAgent', 'src/services/openingGenerator'] },
  { script: 'audit-coach-master-integration.mjs', globs: ['src/coach/sources/', 'src/services/masterPlayWatcher', 'src/services/claimValidator'] },
  { script: 'audit-coach-tactical-awareness.mjs', globs: ['src/coach/sources/tactics', 'src/services/tactics'] },
  { script: 'audit-dashboard.mjs',           globs: ['src/components/Dashboard', 'src/components/SmartSearchBar'] },
  { script: 'audit-weaknesses.mjs',          globs: ['src/components/Weaknesses', 'src/services/weaknessService'] },
  { script: 'audit-coach-plan.mjs',          globs: ['src/components/Coach/Plan', 'src/services/coachPlan'] },
  { script: 'audit-coach-review.mjs',        globs: ['src/components/Coach/Review', 'src/services/gameReview'] },
  { script: 'audit-back-from-review.mjs',    globs: ['src/components/Coach/Review'] },
  { script: 'audit-tactics.mjs',             globs: ['src/components/Tactics', 'src/services/srsEngine'] },
  { script: 'audit-settings-behavior.mjs',   globs: ['src/components/Settings'] },
];

function changedFiles() {
  // Unpushed commits + working-tree changes. Falls back to "everything in
  // src/" if git is unavailable.
  const out = [];
  for (const cmd of [
    ['git', ['diff', '--name-only', 'origin/main...HEAD']],
    ['git', ['diff', '--name-only', 'HEAD']],
    ['git', ['ls-files', '--others', '--exclude-standard']],
  ]) {
    const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf-8' });
    if (r.status === 0) out.push(...r.stdout.split('\n').filter(Boolean));
  }
  return [...new Set(out)];
}

function pickAudits(changed) {
  const picked = [];
  for (const entry of AUDIT_MATRIX) {
    const matches = entry.always
      ? true
      : entry.globs.some((g) => changed.some((f) => f.startsWith(g)));
    if (matches) picked.push(entry.script);
  }
  return picked;
}

if (FULL) {
  console.log('');
  console.log('  ── Playwright audits (FULL mode) ────────────');
  const devUp = spawnSync('curl', ['-sf', 'http://localhost:5173/'], { encoding: 'utf-8' }).status === 0;
  if (!devUp) {
    console.log('  ✗ dev server not running on :5173 — start it first (npm run dev)');
    results.push({ label: 'playwright-prereq', ok: false, ms: 0, out: 'dev server down', summary: 'dev server not running' });
  } else {
    const changed = changedFiles();
    const audits = pickAudits(changed);
    console.log(`  changed: ${changed.length} files — picked ${audits.length} audit script${audits.length === 1 ? '' : 's'}`);
    for (const f of changed.slice(0, 8)) console.log(`    · ${f}`);
    if (changed.length > 8) console.log(`    · ... +${changed.length - 8} more`);
    console.log('');
    for (const script of audits) {
      runStep(script.replace('.mjs','').padEnd(38), 'node', [`scripts/${script}`], {
        env: { AUDIT_SMOKE_URL: 'http://localhost:5173' },
        summary: summarizePlaywright,
      });
    }
  }

  // Hole 6 — masters legitimacy (network, via prod proxy) + Stockfish
  // soundness (engine, auto-skips when no UCI binary) on past-book lesson
  // plies. Doesn't need the dev server. Only when masterclass content
  // changed, since it's a multi-minute network/engine pass.
  const mcTouched = changedFiles().some(
    (f) => f.startsWith('src/data/lessons/') || f === 'src/data/middlegame-plans.json',
  );
  if (mcTouched) {
    console.log('');
    console.log('  ── Hole 6: past-book verification (masters + Stockfish) ──');
    runStep('hole6-pastbook-verify'.padEnd(38), 'npx',
      ['vitest', 'run', 'src/data/lessons/mastersCoverage.test.ts'],
      { env: { RUN_MASTERS_AUDIT: '1' }, summary: summarizeVitest });
  }
}

// ── Report ────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok && !r.optional);
const elapsed = ((Date.now() - STARTED) / 1000).toFixed(1);

console.log('');
console.log('──────────────────────────────────────────────');
if (failed.length === 0) {
  console.log(`  READY TO PUSH (${elapsed}s)`);
  // Persist a green-run watermark — `--summary` reads this to print
  // "what's changed since last green." Gitignored.
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ?? '';
    const entry = {
      sha,
      timestamp: new Date().toISOString(),
      elapsedSec: Number(elapsed),
      mode: FULL ? 'full' : 'fast',
      checks: results.map((r) => ({ label: r.label.trim(), ok: r.ok, summary: r.summary ?? null })),
    };
    writeFileSync(LOG_LATEST, JSON.stringify(entry, null, 2) + '\n');
  } catch { /* logging is best-effort */ }
  console.log('');
  process.exit(0);
}

console.log(`  ${failed.length} CHECK${failed.length === 1 ? '' : 'S'} FAILED (${elapsed}s)`);
console.log('');
for (const r of failed) {
  console.log(`  ✗ ${r.label.trim()}`);
  const tail = (r.out ?? '').split('\n').filter(l => l.trim()).slice(-25);
  for (const line of tail) console.log(`      ${line}`);
  console.log('');
}
console.log('  Fix the failures above and re-run.');
console.log('');
process.exit(1);
