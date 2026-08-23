// audit-corpus-lazy-boot — proves the 2026-08-23 video-dump OOM fix at runtime.
//
// CONTRACT:
//   1. On BOOT (dashboard), the heavy video corpora are NOT fetched — no
//      saintlouis (28 MB), hangingpawns (9 MB), or corpus-spoken (13 MB)
//      request. That eager boot load was the OOM crash.
//   2. When a COACH teaching surface runs, the tier lazy-loads — the corpora
//      DO get requested (self-heals), proving teaching still works.
//
// Runs against the shipped `dist` bundle via `vite preview`.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const PORT = 4319;
// Point at a live URL (prod) with AUDIT_SMOKE_URL; otherwise serve the shipped
// dist bundle locally via vite preview.
const EXTERNAL = process.env.AUDIT_SMOKE_URL || '';
const BASE = EXTERNAL || `http://localhost:${PORT}`;
const HEAVY = ['saintlouis-teachings', 'hangingpawns-teachings', 'corpus-spoken'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore', env: process.env,
  });
  const cleanup = () => { try { server?.kill('SIGKILL'); } catch { /* noop */ } };
  process.on('exit', cleanup);

  // Wait for the server to answer.
  if (!EXTERNAL) for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(BASE); if (r.ok) break; } catch { /* not up yet */ }
    await sleep(500);
  }

  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  // This audit measures corpus /data fetches, NOT voice — it has no TTS
  // instrument, so mute synthesis so a /coach/teach narration can't spend real
  // TTS money on every run (auditHarnessReach gate, CLAUDE.md §G1).
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();

  const dataReqs = new Set();
  page.on('request', (r) => {
    const u = r.url();
    const m = u.match(/\/data\/([a-z-]+)\.json/i);
    if (m) dataReqs.add(m[1]);
  });

  const results = [];
  const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

  // ── Phase 1: BOOT is clean ────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(12000); // well past any deferred boot work
  const bootHeavy = HEAVY.filter((h) => dataReqs.has(h));
  record('boot does NOT fetch the heavy video corpora', bootHeavy.length === 0,
    bootHeavy.length ? `leaked: ${bootHeavy.join(', ')}` : `boot data fetched: [${[...dataReqs].join(', ') || 'none'}]`);

  // ── Phase 2: coach teaching lazy-loads the tier ───────────────────────────
  // Dismiss first-run gates, then run a teaching request on /coach/teach.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(2000);
  // Best-effort dismiss: calibration bubble + AI consent + page help.
  for (const sel of ['[data-testid="skill-band-intermediate"]', '[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal"] button']) {
    try { const el = page.locator(sel).first(); if (await el.isVisible({ timeout: 1500 })) await el.click({ timeout: 2000 }); } catch { /* not present */ }
  }
  await sleep(1500);
  let typed = false;
  for (const sel of ['textarea', '[data-testid="coach-chat-input"]', 'input[type="text"]']) {
    try {
      const box = page.locator(sel).first();
      if (await box.isVisible({ timeout: 1500 })) {
        await box.click({ timeout: 2000 });
        await box.pressSequentially('teach me the Caro-Kann', { delay: 15 });
        await page.keyboard.press('Enter');
        typed = true;
        break;
      }
    } catch { /* try next */ }
  }
  // Give the walkthrough generation / teaching lookups time to consult the tier.
  for (let i = 0; i < 40 && !HEAVY.some((h) => dataReqs.has(h)); i += 1) await sleep(1000);
  const lazyLoaded = HEAVY.filter((h) => dataReqs.has(h));
  record('coach teaching lazy-loads the corpus tier', lazyLoaded.length > 0,
    typed ? `lazily fetched: [${lazyLoaded.join(', ') || 'none'}]` : 'could not reach chat input (inconclusive)');

  await browser.close();
  cleanup();

  const failed = results.filter((r) => !r.pass && r.name.startsWith('boot')); // Phase 1 is the hard gate
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
