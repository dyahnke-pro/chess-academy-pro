#!/usr/bin/env node
/**
 * audit-vacuity-check — THE META-AUDIT: can each audit actually FAIL?
 *
 * A green audit is worth exactly as much as its ability to go red. Three times
 * in one session (2026-09-02) an audit reported PASS having verified nothing:
 *
 *   - audit-analysis-pool-engine force-clicked into the ai-consent overlay,
 *     which swallowed the click. Playwright reported success, the analyze
 *     button never fired, and the run logged "clicked the real button".
 *   - the SF1/SF2 engine-build checks were first added to the REVIEW audit,
 *     a surface where the worker pool never spawns — they could only ever
 *     have passed vacuously.
 *   - a board-verdict finding was chased for hours against a stale bundle.
 *
 * CLAUDE.md already names the rule ("a click-if-present that no-ops and logs ok
 * is a bug in the audit") and the failure keeps recurring, because nothing
 * MEASURES it. This does.
 *
 * The method is a negative control. Point an audit at an app that is not there
 * — a local server returning a blank page for every request — and it MUST fail.
 * Anything that still prints PASS lines is asserting something that does not
 * depend on the product, which is the definition of a check that cannot fail.
 *
 * Verdicts:
 *   VACUOUS  printed PASS lines against a blank app  → the audit is broken
 *   OK       exited non-zero, or printed no passes   → it noticed the void
 *   HUNG     produced no verdict inside the timeout  → no timeout discipline;
 *            a real prod outage would hang CI rather than report
 *
 * Usage:
 *   node scripts/audit-vacuity-check.mjs audit-dashboard.mjs audit-tactics.mjs
 *   node scripts/audit-vacuity-check.mjs --all --shard 1/8
 *   node scripts/audit-vacuity-check.mjs --changed        # audits touched vs origin/main
 *
 * Env: VACUITY_TIMEOUT_MS (default 90000), VACUITY_PORT (default 8971).
 */
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const TIMEOUT_MS = Number(process.env.VACUITY_TIMEOUT_MS ?? 90_000);
const PORT = Number(process.env.VACUITY_PORT ?? 8971);
const args = process.argv.slice(2);

/** Every audit that drives a browser — the only ones a blank origin can test. */
function browserAudits() {
  return readdirSync(join(repoRoot, 'scripts'))
    .filter((f) => /^audit-.*\.mjs$/.test(f))
    .filter((f) => {
      try {
        return readFileSync(join(repoRoot, 'scripts', f), 'utf8').includes('chromium.launch');
      } catch { return false; }
    })
    .sort();
}

function changedAudits() {
  const r = spawnSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  const names = (r.stdout ?? '').split('\n')
    .filter((f) => /^scripts\/audit-.*\.mjs$/.test(f))
    .map((f) => f.replace('scripts/', ''));
  return [...new Set(names)];
}

function selectTargets() {
  if (args.includes('--changed')) return changedAudits();
  if (args.includes('--all')) {
    const all = browserAudits();
    const shardArg = args[args.indexOf('--shard') + 1];
    if (args.includes('--shard') && /^\d+\/\d+$/.test(shardArg ?? '')) {
      const [i, n] = shardArg.split('/').map(Number);
      return all.filter((_, idx) => idx % n === i - 1);
    }
    return all;
  }
  return args.filter((a) => a.endsWith('.mjs'));
}

/** The app that is not there: every request answers 200 with an empty page, so
 *  navigation SUCCEEDS and nothing the audit looks for exists. A 404 or a dead
 *  port would let an audit fail on the network rather than on its assertions,
 *  which is a weaker test — we want it to reach a page and find nothing. */
function startVoidServer() {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      const url = req.url ?? '/';
      if (url.includes('/api/')) {
        resp.writeHead(200, { 'Content-Type': 'application/json' });
        resp.end('{}');
        return;
      }
      resp.writeHead(200, { 'Content-Type': 'text/html' });
      resp.end('<!doctype html><html><head><title>void</title></head><body></body></html>');
    });
    server.listen(PORT, () => res(server));
  });
}

const PASS_LINE = /^\s*(?:\[PASS\]|✅|✓ PASS|PASS\b)/m;

function runAudit(name) {
  return new Promise((res) => {
    const started = Date.now();
    const child = spawn('node', [join('scripts', name)], {
      cwd: repoRoot,
      env: {
        ...process.env,
        AUDIT_SMOKE_URL: `http://127.0.0.1:${PORT}`,
        AUDIT_SANDBOX: '1',
        // Never let a vacuity run spend TTS money or hit the real audit stream.
        AUDIT_STREAM_SECRET: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const elapsed = Date.now() - started;
      const killed = signal === 'SIGKILL';
      const printedPass = PASS_LINE.test(out);
      const verdict = killed ? 'HUNG' : printedPass && code === 0 ? 'VACUOUS' : 'OK';
      res({ name, verdict, code, elapsed, printedPass, tail: out.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 300) });
    });
  });
}

const targets = selectTargets();
if (targets.length === 0) {
  console.error('No audits selected. Pass script names, --all [--shard i/n], or --changed.');
  process.exit(2);
}

console.log(`── vacuity check — ${targets.length} audit(s) against a blank app ──\n`);
const server = await startVoidServer();
const results = [];
try {
  for (const name of targets) {
    const r = await runAudit(name);
    results.push(r);
    const tag = r.verdict === 'VACUOUS' ? '❌ VACUOUS' : r.verdict === 'HUNG' ? '⏳ HUNG   ' : '✅ OK     ';
    console.log(`${tag} ${name} (${(r.elapsed / 1000).toFixed(0)}s, exit ${r.code ?? 'killed'})`);
    if (r.verdict !== 'OK') console.log(`           ${r.tail}`);
  }
} finally {
  server.close();
}

const vacuous = results.filter((r) => r.verdict === 'VACUOUS');
const hung = results.filter((r) => r.verdict === 'HUNG');
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'vacuity-check.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));

console.log(`\n${results.length - vacuous.length - hung.length}/${results.length} noticed the void`);
if (vacuous.length) {
  console.log(`\n❌ ${vacuous.length} audit(s) PASSED against an app that is not there:`);
  for (const r of vacuous) console.log(`   ${r.name}`);
  console.log('   These assert something that does not depend on the product.');
}
if (hung.length) {
  console.log(`\n⏳ ${hung.length} audit(s) produced no verdict in ${TIMEOUT_MS / 1000}s:`);
  for (const r of hung) console.log(`   ${r.name}`);
  console.log('   A real outage would hang CI instead of reporting.');
}
console.log(`\nreport: audit-reports/vacuity-check.json`);
process.exitCode = vacuous.length > 0 ? 1 : 0;
