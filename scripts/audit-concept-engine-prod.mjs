// audit-concept-engine-prod — post-deploy audit for the COMPUTED-CONCEPT ENGINE
// (docs/plans/2026-09-14-computed-concept-detectors.md, P1–P3 + the Master
// Level square). Three instruments, MUTED (G1 — never a byte of TTS):
//   1. Playwright drives the real surfaces on LIVE prod.
//   2. The app's own audit events are captured on a LOOPBACK listener sidecar
//      (the prod audit-stream is opt-in/off by default — see CLAUDE.md §G2).
//   3. Narration events (coach-narration-spoken / voice-speak-invoked) are read
//      off that same listener to prove what the coach SAID, not that a
//      function ran.
//
// Contracts asserted (experience, not text-presence):
//   A. /tactics carries the Master Level tile and it routes to /tactics/master
//      (David 2026-09-14: "reach it from both surfaces").
//   B. /tactics/drill serves a real puzzle; after Show Solution the concept
//      explanation renders with a COMPUTED concept name + the board-true line
//      + the general idea — and the name is one of the engine's concept ids
//      (tactic / mate / technique / matchup), never empty.
//   C. The rendered explanation is gate-clean: never "we/our/us", names a
//      square or a pattern (Narration Voice Rule 1).
//   D. Vacuity guard: the drill is driven at least twice and at least one
//      explanation was decoded — an audit that saw zero puzzles cannot pass.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-concept-engine-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PUZZLES = Number(process.env.AUDIT_CONCEPT_PUZZLES || 3);

/** Names the engine can produce (conceptEngine registers + mating-patterns +
 *  endgame techniques + the tag display names it falls back to). A rendered
 *  concept name must be one of these — otherwise it came from nowhere. */
const KNOWN_NAME = /fork|pin|skewer|discover|double check|back.rank|removing the guard|trapped piece|mating threat|overloaded|battery|mate|opposition|key squares|rule of the square|rook-pawn|lucena|philidor|cutting off|rook behind|wrong-bishop|ending|passed pawn|outpost|open file|king safety|pawn storm|piece activity|deflection|attraction|decoy|clearance|zwischenzug|x-ray|sacrifice|greek gift|interference|double attack/i;

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);          // G1: audits run muted
await ctx.addInitScript(autoDismissCalibration);   // CSS-based, never a hanging click
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismissModals() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 4000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

try {
  // Attach the loopback listener (instruments 2 + 3) before any surface mounts.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

  // ── A. Master Level from the Tactics hub ───────────────────────────────────
  await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  const tile = page.getByText('Master Level', { exact: true }).first();
  let tileVisible = false;
  try { await tile.waitFor({ timeout: 20000 }); tileVisible = true; } catch { /* absent */ }
  check('A1 Tactics hub shows the Master Level tile', tileVisible);
  if (tileVisible) {
    await tile.click({ force: true });
    let routed = false;
    try { await page.waitForURL(/\/tactics\/master/, { timeout: 15000 }); routed = true; } catch { /* no route */ }
    check('A2 tile routes to /tactics/master', routed, page.url());
    if (routed) {
      let mounted = false;
      try { await page.locator('[data-testid="adaptive-puzzle-page"]').waitFor({ timeout: 20000 }); mounted = true; } catch { /* no mount */ }
      check('A3 Master Level page mounts (elite pool surface)', mounted);
    }
  }

  // ── B/C. The drill teaches the COMPUTED concept ────────────────────────────
  await page.goto(`${BASE}/tactics/drill`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="tactic-drill-page"]').waitFor({ timeout: 30000 });
  let decoded = 0;
  const seenNames = [];
  for (let i = 0; i < PUZZLES; i++) {
    const board = page.locator('[data-testid="puzzle-board"]');
    try { await board.waitFor({ timeout: 30000 }); } catch { check(`B${i + 1} puzzle ${i + 1} loaded`, false, 'no puzzle-board'); break; }
    // Let the board settle (the opponent's setup move animates first).
    await page.waitForTimeout(1500);
    const show = page.locator('[data-testid="show-solution-button"]');
    let shown = false;
    try { await show.waitFor({ timeout: 15000 }); await show.click({ force: true }); shown = true; } catch { /* no button */ }
    check(`B${i + 1} puzzle ${i + 1}: Show Solution is a real affordance`, shown);
    if (!shown) break;
    const panel = page.locator('[data-testid="puzzle-concept-explanation"]');
    let rendered = false;
    try { await panel.waitFor({ timeout: 20000 }); rendered = true; } catch { /* absent */ }
    check(`B${i + 1} puzzle ${i + 1}: concept explanation renders after the solution`, rendered);
    if (rendered) {
      const text = (await panel.innerText()).trim();
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const name = lines.length > 1 ? lines[0] : '';
      const spoken = lines[lines.length - 1] ?? '';
      decoded += 1;
      if (name) seenNames.push(name);
      check(`B${i + 1} puzzle ${i + 1}: names a concept the ENGINE can produce`, KNOWN_NAME.test(name), name || '(no name line)');
      check(`C${i + 1} puzzle ${i + 1}: explanation is gate-clean (no we/our/us) and concrete`, !/\b(we|our|us)\b/i.test(spoken) && (/\b[a-h][1-8]\b/.test(spoken) || KNOWN_NAME.test(spoken)), spoken.slice(0, 140));
    }
    // Next puzzle — the drill's own nav.
    const next = page.locator('[data-testid="nav-next"]');
    try { await next.waitFor({ timeout: 8000 }); await next.click({ force: true }); await page.waitForTimeout(800); } catch { break; }
  }
  check('D vacuity guard: ≥2 puzzles driven AND ≥1 explanation decoded', decoded >= Math.min(2, PUZZLES) && decoded >= 1, `decoded=${decoded} names=${seenNames.join(' | ')}`);

  // ── Instruments 2 + 3: the app's own events reached the listener ──────────
  await page.waitForTimeout(2500); // let the batched audit POSTs flush
  const events = listener.getCapturedEvents();
  const routeEvents = events.filter((e) => /route|tactics/i.test(`${e.kind ?? ''} ${e.source ?? ''} ${e.summary ?? ''}`));
  check('E audit events captured on the loopback listener (instrument 2 alive)', events.length > 0, `${events.length} events, ${routeEvents.length} routing`);
  const voice = events.filter((e) => /voice|speak|narration|tts/i.test(e.kind ?? ''));
  check('F voice instrument: every narration event is MUTED (no /api/tts spend)', !voice.some((e) => /speakCloud|speakStreamed/.test(e.source ?? '') && !/audit/i.test(e.summary ?? '')), `${voice.length} narration events`);
  check('G no page errors during the run', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  check('RUN', false, `ERROR ${String(e).slice(0, 200)}`);
}

await browser.close();
await listener.stop();

const pass = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `concept-engine-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, results, pageErrors }, null, 2));
console.log(`\n${pass}/${results.length} checks green — report ${dir}/report.json`);
process.exit(pass === results.length ? 0 : 1);
