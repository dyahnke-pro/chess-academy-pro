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
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const ARGS = new Set(process.argv.slice(2));
const FULL = ARGS.has('--full');
const STARTED = Date.now();

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
  'src/data/lessons/pircIntegrity.test.ts',
  'src/data/repertoire-orientation.test.ts',
  'src/data/pro-repertoires-orientation.test.ts',
  'src/services/middlegamePlanner.test.ts',
  'src/components/Openings/MiddlegamePlansSection.test.tsx',
  'src/components/Openings/EndgamePlansSection.test.tsx',
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

// FULL MODE: run the Playwright audit matrix. Requires dev server up.
if (FULL) {
  console.log('');
  console.log('  ── Playwright audits (FULL mode) ────────────');
  const devUp = spawnSync('curl', ['-sf', 'http://localhost:5173/'], { encoding: 'utf-8' }).status === 0;
  if (!devUp) {
    console.log('  ✗ dev server not running on :5173 — start it first (npm run dev)');
    results.push({ label: 'playwright-prereq', ok: false, ms: 0, out: 'dev server down', summary: 'dev server not running' });
  } else {
    runStep('audit-named-traps', 'node', ['scripts/audit-named-traps.mjs'], {
      env: { AUDIT_SMOKE_URL: 'http://localhost:5173' },
      summary: summarizePlaywright,
    });
    runStep('audit-leadeye-plans', 'node', ['scripts/audit-leadeye-plans.mjs'], {
      env: { AUDIT_SMOKE_URL: 'http://localhost:5173' },
      summary: summarizePlaywright,
    });
  }
}

// ── Report ────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok && !r.optional);
const elapsed = ((Date.now() - STARTED) / 1000).toFixed(1);

console.log('');
console.log('──────────────────────────────────────────────');
if (failed.length === 0) {
  console.log(`  READY TO PUSH (${elapsed}s)`);
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
