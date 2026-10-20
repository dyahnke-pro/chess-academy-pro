#!/usr/bin/env node
/**
 * audit-review-theory — the Review's OPENING THEORY section, driven on real
 * games from David's record (his "Send my data" drop), MUTED.
 *
 * Seeds each game (with its saved engine analysis, so no engine wait) into
 * Dexie, opens its review, starts the walk, presses Theory, and reads every
 * line the coach SPEAKS off the narration listener (coach-narration-spoken,
 * full text). Contracts, per game:
 *   - the Theory button appears and the lecture speaks;
 *   - no line hands the student the OTHER seat's plan (a curated idea for the
 *     wrong colour), and none says the invented "opponents prepare for it less";
 *   - a fork names its alternatives (when the lecture offers one).
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-review-theory-prod.mjs
 *   THEORY_GAMES=<id,id> to pick the games (default: Vienna, Scandinavian, Old Sicilian).
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const DROP = process.env.AUDIT_FIXTURE || 'audit-reports/.fixtures/data-drop-david.json';
const IDS = (process.env.THEORY_GAMES || 'chesscom-1038626480,chesscom-1034830120,chesscom-1040709576').split(',');
const ME = 'Knight_Mare_01';

if (!existsSync(DROP)) { console.error(`no fixture at ${DROP} — run scripts/read-data-drop.mjs --latest first`); process.exit(2); }
const games = JSON.parse(readFileSync(DROP, 'utf8')).stores.games.filter((g) => IDS.includes(g.id));
if (!games.length) { console.error('none of the requested games are in the drop'); process.exit(2); }

const rows = [];
const add = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name} — ${detail}`); };
const out = [];

const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const listener = await attachVoiceListener(ctx);
const page = await ctx.newPage();
await blockTtsNetwork(page);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));

for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
await page.waitForTimeout(6000);
await page.evaluate(async (rowsIn) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  for (const g of rowsIn) {
    await new Promise((res, rej) => { const t = db.transaction('games', 'readwrite'); t.objectStore('games').put(g); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
  }
}, games);

const spoken = () => listener.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
  .map((e) => String(e.narrationText));

for (const g of games) {
  const seat = g.white === ME ? 'white' : 'black';
  out.push(`\n=== ${g.id} (${g.eco}) — David is ${seat}`);
  await page.goto(`${BASE}/coach/review/${g.id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const startBtn = page.locator('[data-testid="start-walk-btn"]').first();
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    if ((await startBtn.count()) > 0 && (await startBtn.getAttribute('disabled').catch(() => 'x')) === null) break;
    await page.waitForTimeout(1500);
  }
  await startBtn.click({ timeout: 5000 }).catch(() => undefined);
  const theory = page.locator('[data-testid="walk-theory-btn"]').first();
  const t1 = Date.now();
  while (Date.now() - t1 < 60000 && (await theory.count()) === 0) await page.waitForTimeout(1000);
  if ((await theory.count()) === 0) { add(`${g.id} theory-button`, false, 'Theory never appeared'); continue; }
  // Pause the walk's own narration so only the lecture is read.
  const pp = page.locator('[data-testid="review-play-pause-btn"]').first();
  if (/Pause/.test((await pp.textContent().catch(() => '')) ?? '')) await pp.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(2000);
  const before = spoken().length;
  await theory.click({ timeout: 5000 }).catch(() => undefined);
  // The lecture ends when the button flips back to "Theory".
  const t2 = Date.now();
  await page.waitForTimeout(3000);
  while (Date.now() - t2 < 240000) {
    const label = (await theory.textContent().catch(() => '')) ?? '';
    if (!/Stop theory/.test(label)) break;
    await page.waitForTimeout(1500);
  }
  const lines = spoken().slice(before);
  for (const l of lines) out.push(`  • ${l}`);
  add(`${g.id} lecture-spoke`, lines.length >= 2, `${lines.length} lines`);
  const otherSeat = seat === 'white' ? /Develop the light-squared bishop to f5 BEFORE playing \.\.\.e6|Recapture on d5 with the queen/ : /\.\.\.a6 prevents Bb5\+/;
  add(`${g.id} no-other-seat-idea`, !lines.some((l) => otherSeat.test(l)), 'no curated idea for the other colour or another line');
  add(`${g.id} no-invented-compare`, !lines.some((l) => /prepare for it less|matter of style/i.test(l)), 'no "opponents prepare for it less"');
  const fork = lines.find((l) => /other main roads|another main road/.test(l));
  if (fork) add(`${g.id} fork-named`, true, fork.slice(0, 120));
}
add('no page errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');

mkdirSync('audit-reports', { recursive: true });
writeFileSync('audit-reports/review-theory-spoken.txt', out.join('\n'));
console.log(out.join('\n'));
await listener.stop();
await browser.close();
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} passed`);
process.exit(failed ? 1 : 0);
