#!/usr/bin/env node
/**
 * PLAY VOLUNTEERS NOTHING — the live proof (David 2026-09-23: "Coach play
 * shouldn't talk at all").
 *
 * Plays a real game on /coach/play by clicking squares, DELIBERATELY hangs
 * pieces so the slip / blunder / threat detectors have every reason to speak,
 * and counts every `coach-narration-spoken` row the app emits. The bar is ZERO
 * before the student asks.
 *
 * NEGATIVE CONTROL, so zero cannot be vacuous: at the end it taps "Read this
 * position" — an on-request line that MUST still speak. If the listener hears
 * nothing then either, it heard nothing all along and the zero means nothing.
 *
 * MUTED (G1): `muteTtsForAudit` keeps the spoken-text events, no synthesis.
 * Three instruments: Playwright drives, the loopback listener hears the voice,
 * and the app's own audit rows (same sidecar) show the `play-silent` reasons.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-play-silent-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { readPlacement, placementOf, samePlacement, sleep } from './audit-lib/board-drive.mjs';
import { spokenTextOf } from './audit-lib/coach-tab-graders.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OUT_DIR = `audit-reports/play-silent-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const STUDENT_MOVES = 10;
const results = [];
const pass = (n, d = '') => { results.push({ n, ok: true, d }); console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d = '') => { results.push({ n, ok: false, d }); console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`); };

/** A move that hangs something: prefer a non-pawn landing on a square an enemy
 *  pawn/piece attacks with nothing defending it. Falls back to any legal move. */
function pickHangingMove(chess) {
  const moves = chess.moves({ verbose: true });
  const opp = chess.turn() === 'w' ? 'b' : 'w';
  const scored = moves.map((m) => {
    const p = new Chess(chess.fen()); p.move(m.san);
    const attacked = p.isAttacked(m.to, opp);
    const defended = p.isAttacked(m.to, chess.turn());
    const value = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 }[m.piece];
    return { m, s: attacked && !defended ? value : 0 };
  }).sort((a, b) => b.s - a.s);
  return (scored[0]?.s ? scored[0] : scored[Math.floor(moves.length / 2)])?.m;
}

async function clickSq(page, sq) {
  await page.locator(`[data-square="${sq}"]`).first().click({ timeout: 8000, force: true });
}

/** Wait until the board shows a legal reply to `chess`; return its SAN or null. */
async function awaitReply(page, chess, timeoutMs = 45_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const shown = await readPlacement(page);
    for (const m of chess.moves({ verbose: true })) {
      const p = new Chess(chess.fen()); p.move(m.san);
      if (samePlacement(placementOf(p.fen()), shown)) return m.san;
    }
    await sleep(500);
  }
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[play-silent] base = ${BASE_URL}\n[play-silent] listener = ${listener.url}`);
  const browser = await chromium.launch({
    args: sandboxLaunchArgs(), headless: true, executablePath: await resolveChromiumExecutable(false),
  });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, listener.secret]);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(5000);
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal-close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(400); }
  }
  const up = await page.locator('[data-square]').first().waitFor({ state: 'attached', timeout: 30_000 }).then(() => true).catch(() => false);
  if (up) pass('board mounts'); else { fail('board mounts'); }

  const chess = new Chess();
  let landed = 0; let hangs = 0;
  for (let i = 0; up && i < STUDENT_MOVES && !chess.isGameOver(); i++) {
    // Normal-ish opening moves first, then hang material every move.
    const mv = i < 2
      ? chess.moves({ verbose: true }).find((m) => ['e4', 'Nf3'].includes(m.san)) ?? chess.moves({ verbose: true })[0]
      : pickHangingMove(chess);
    if (!mv) break;
    const before = new Chess(chess.fen());
    try { await clickSq(page, mv.from); await sleep(200); await clickSq(page, mv.to); } catch { break; }
    const after = new Chess(chess.fen()); after.move(mv.san);
    // Did it land (or land + reply already)?
    await sleep(800);
    const shown = await readPlacement(page);
    const landedExact = samePlacement(shown, placementOf(after.fen()));
    const landedPast = !landedExact && after.moves().some((r) => { const q = new Chess(after.fen()); q.move(r); return samePlacement(placementOf(q.fen()), shown); });
    if (!landedExact && !landedPast) { console.log(`  · move ${mv.san} did not land`); continue; }
    chess.move(mv.san); landed += 1;
    if (i >= 2) hangs += 1;
    const reply = await awaitReply(page, chess);
    if (!reply) { console.log(`  · no reply after ${mv.san}`); break; }
    chess.move(reply);
    console.log(`  · ${before.moveNumber()}. ${mv.san} ${reply}`);
  }
  if (landed >= 6) pass('a real game was played', `${landed} student moves, ${hangs} deliberately hanging`);
  else fail('a real game was played', `only ${landed} student moves landed`);
  await sleep(4000); // let any late narration flush

  const events = listener.getCapturedEvents();
  const spokenRows = events.filter((e) => (e.kind ?? '') === 'coach-narration-spoken');
  const spoken = spokenRows.map((e) => ({ source: e.source ?? '?', text: spokenTextOf(e) })).filter((x) => x.text);
  const silentReasons = events.filter((e) => /play-silent|playSilent=true/.test(e.summary ?? '')).length;
  if (!spoken.length) pass('Play volunteered nothing', `0 spoken lines across ${landed} moves; ${silentReasons} detector row(s) suppressed as play-silent`);
  else fail('Play volunteered nothing', `${spoken.length} line(s): ${spoken.slice(0, 5).map((s) => `[${s.source}] ${s.text.slice(0, 80)}`).join(' | ')}`);
  if (silentReasons > 0) pass('the detectors still RAN (suppressed, not dead)', `${silentReasons} play-silent row(s)`);
  else fail('the detectors still RAN (suppressed, not dead)', 'no play-silent audit rows — cannot tell silence from a dead detector');

  // NEGATIVE CONTROL: an on-request line must still speak.
  const n0 = listener.getCapturedEvents().length;
  const btn = page.locator('[data-testid="read-position-btn"]').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ force: true }).catch(() => {});
    let heard = [];
    for (let t = 0; t < 40 && !heard.length; t++) {
      await sleep(1000);
      heard = listener.getCapturedEvents().slice(n0)
        .filter((e) => (e.kind ?? '') === 'coach-narration-spoken').map(spokenTextOf).filter(Boolean);
    }
    if (heard.length) pass('tapped "Read this position" still speaks (listener is live)', `"${heard[0].slice(0, 90)}"`);
    else fail('tapped "Read this position" still speaks (listener is live)', 'heard nothing — the zero above is unproven');
  } else fail('tapped "Read this position" still speaks (listener is live)', 'button not visible');

  if (pageErrors.length) fail('no page errors', pageErrors.slice(0, 3).join(' | ')); else pass('no page errors');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ results, spoken, moves: chess.history(), pageErrors }, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[play-silent] ${results.length - failed}/${results.length} green — ${OUT_DIR}/report.json`);
  await browser.close(); await listener.close?.();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('[play-silent] threw:', e); process.exit(1); });
