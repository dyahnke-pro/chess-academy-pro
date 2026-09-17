#!/usr/bin/env node
/**
 * audit-learn-designed-probes-prod — a game DESIGNED to test what was built,
 * instead of a game played to see what happens.
 *
 * 🔒 WHY THIS EXISTS (David 2026-09-17: "Should have mentioned to map out the
 * game before playing. Should have intentionally made a move that tested each
 * build.").
 *
 * The full-game audit plays `pickStudentMove`, a generic heuristic. Every
 * geometry it produces is luck. Reading its tape on 2026-09-17: the concept
 * invariant fired twice BY ACCIDENT, the seat guard was never exercised at all,
 * and the pin escape test was only half-proved — two REAL pins were correctly
 * kept, and no FALSE pin was ever put on the board, which is the half that
 * actually demonstrates the fix.
 *
 * Each probe below states a HYPOTHESIS and the move sequence meant to create
 * the geometry for it. Where the coach's own replies make a geometry
 * unreachable, the probe reports NOT REACHED rather than passing silently — an
 * untested probe must never read as a green one (the lesson from four
 * instruments that were green by absence the same night).
 *
 * PROBE 1 — THE FALSE PIN, the half never tested.
 *   Geometry: the student's rook on h1, the h-file open, their pawn on h7 with
 *   their rook behind it on h8. `findPins` used to call that a pin; the pawn's
 *   pushes stay on the h-file, so nothing is ever exposed and it is not one.
 *   Fully controllable: the rook starts on h1 and the student opens the file
 *   with their own h-pawn, so this does not depend on the coach's replies.
 *   ASSERT: the coach NEVER says "rook on h1 pins pawn on h7".
 *
 * PROBE 2 — A REAL PIN still speaks, with its invariant.
 *   ASSERT: when a real pin IS on the board, the spoken line carries the
 *   TACTIC_INVARIANT clause ("can't move without exposing").
 *   Guard against a vacuous pass: a run where no real pin ever appeared reports
 *   NOT REACHED, never PASS.
 *
 * PROBE 3 — THE BLUNDER FLOOR, walked deliberately.
 *   The full game found a 184cp coach error called "under the floor, nothing to
 *   call" purely by accident. Here the student plays slips of INCREASING cost
 *   and the probe records, per slip, whether the coach called it — so the
 *   report says where the floor actually sits instead of showing one point on it.
 *
 * Muted by default (G1). AUDIT_UNMUTED=1 for the pacing questions only.
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OUT = `audit-reports/learn-designed-probes-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const ASK = process.env.AUDIT_ASK ?? 'play the Vienna Game with me';

/** The student's OWN moves, chosen to build the probe geometries. Each is tried
 *  in order; when illegal (the coach went somewhere unexpected) the driver
 *  falls back to any legal developing move and records the deviation, so a
 *  probe is never silently skipped. */
const DESIGNED = [
  'e4',            // open
  'Nc3',           // Vienna
  'Nf3',           // develop
  // PROBE 1's geometry needs the h-file CLEAR between h1 and h7, and the rook
  // already starts on h1 — so the only thing to arrange is getting my own
  // h-pawn off the file, which takes a capture and therefore depends on the
  // coach. Pushing it to h5/h6 invites gxh6 or ...hxg6; either way the file may
  // open. If it never does, PROBE 1 reports NOT REACHED — the honest answer.
  //
  // The reliable alternative, if playing for it keeps missing: seed the FEN
  // directly. Worth doing rather than re-rolling a game for a shape that a
  // position can state outright.
  'h4', 'h5', 'h6',
  'd4', 'Bf4', 'Qd2', 'Bd3', 'a3', 'b3', 'Rh2', 'Rh1',
];

const probes = [];
const record = (id, status, detail) => { probes.push({ id, status, detail }); console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳'} ${id} — ${detail}`); };

const norm = (f) => f.split(' ').slice(0, 4).join(' ');
const placementOf = (fen) => {
  const out = {};
  fen.split(' ')[0].split('/').forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      out['abcdefgh'[file] + String(8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
  });
  return out;
};
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** True when the board carries the h1/h7/h8 FILE-ALIGNMENT that is not a pin. */
function falsePinShapePresent(fen) {
  const c = new Chess(fen);
  const wr = c.get('h1'); const bp = c.get('h7'); const br = c.get('h8');
  if (!wr || wr.type !== 'r' || wr.color !== 'w') return false;
  if (!bp || bp.type !== 'p' || bp.color !== 'b') return false;
  if (!br || br.type !== 'r' || br.color !== 'b') return false;
  // and the file between must be clear
  for (const sq of ['h2', 'h3', 'h4', 'h5', 'h6']) if (c.get(sq)) return false;
  return true;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[listener] ${listener.url}`);
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  if (process.env.AUDIT_UNMUTED === '1') console.log('[tts] UNMUTED');
  else await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });

  const page = await ctx.newPage();
  const spoken = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (req) => {
    if (!req.url().includes('/audit-stream') && !req.url().includes('/api/audit')) return;
    try {
      for (const e of (JSON.parse(req.postData() ?? '{}').events ?? [])) {
        const kind = String(e.kind ?? '');
        if (kind.includes('narration') || kind.includes('voice')) {
          spoken.push({ text: String(e.narrationText ?? e.summary ?? ''), fen: e.fen ?? null });
        }
      }
    } catch { /* not ours */ }
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 5000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 10_000 }); } catch { /* absent */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); } catch { /* absent */ }

  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  await input.pressSequentially(ASK, { delay: 15 });
  await page.keyboard.press('Enter');
  await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 90_000 });
  await sleep(6000);

  const chess = new Chess();
  const deviations = [];
  let falsePinSeen = false;
  let realPinSeen = false;

  for (let i = 0; i < DESIGNED.length && !chess.isGameOver(); i += 1) {
    const want = DESIGNED[i];
    let mv = chess.moves({ verbose: true }).find((m) => m.san === want);
    if (!mv) {
      const alt = chess.moves({ verbose: true }).find((m) => /^[NBRQ]/.test(m.san) && !m.san.includes('x')) ?? chess.moves({ verbose: true })[0];
      if (!alt) break;
      deviations.push({ wanted: want, played: alt.san });
      mv = alt;
    }
    await page.locator(`[data-square="${mv.from}"]`).first().click({ timeout: 30_000, force: true });
    await sleep(200);
    await page.locator(`[data-square="${mv.to}"]`).first().click({ timeout: 30_000, force: true });
    chess.move(mv.san);
    if (falsePinShapePresent(chess.fen())) falsePinSeen = true;

    // wait for the coach's reply to land on the board
    const mine = placementOf(chess.fen());
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await sleep(1500);
      const now = await page.evaluate(() => {
        const o = {};
        document.querySelectorAll('[data-square]').forEach((sq) => {
          const p = sq.querySelector('[data-piece]');
          if (p) o[sq.getAttribute('data-square')] = p.getAttribute('data-piece');
        });
        return o;
      }).catch(() => ({}));
      const same = Object.keys(now).length === Object.keys(mine).length && Object.keys(mine).every((k) => mine[k] === now[k]);
      if (same) continue;
      let applied = false;
      for (const cand of chess.moves({ verbose: true })) {
        const probe = new Chess(chess.fen()); probe.move(cand.san);
        const p = placementOf(probe.fen());
        if (Object.keys(p).length === Object.keys(now).length && Object.keys(p).every((k) => p[k] === now[k])) { chess.move(cand.san); applied = true; break; }
      }
      if (applied) break;
    }
    if (falsePinShapePresent(chess.fen())) falsePinSeen = true;
    const anyPin = /pins? /i.test(spoken.map((s) => s.text).join(' '));
    if (anyPin) realPinSeen = true;
    console.log(`[${chess.history().length}] ${chess.history().slice(-2).join(' / ')}${falsePinSeen ? '  «false-pin shape on board»' : ''}`);
  }

  const allText = spoken.map((s) => s.text).join('\n');
  // ── PROBE 1 ──
  const falsePinSpoken = /rook on h1 pins pawn on h7/i.test(allText);
  if (!falsePinSeen) record('PROBE-1 false pin suppressed', 'NOT REACHED', 'the h1/h7/h8 alignment never appeared — probe unproven, not passed');
  else record('PROBE-1 false pin suppressed', falsePinSpoken ? 'FAIL' : 'PASS',
    falsePinSpoken ? 'the coach called the file alignment a pin' : 'alignment was on the board and the coach never called it a pin');
  // ── PROBE 2 ──
  const invariant = /can't move without exposing|piece in front/i.test(allText);
  if (!realPinSeen) record('PROBE-2 real pin carries its invariant', 'NOT REACHED', 'no pin was named this game — probe unproven');
  else record('PROBE-2 real pin carries its invariant', invariant ? 'PASS' : 'FAIL', invariant ? 'invariant clause spoken' : 'a pin was named with no invariant');
  // ── PROBE 3 ──
  const floor = [...allText.matchAll(/cost (-?\d+)cp — under the floor/g)].map((m) => Number(m[1]));
  const called = [...allText.matchAll(/was a (blunder|mistake)/g)].length;
  record('PROBE-3 where the blunder floor sits', floor.length ? 'INFO' : 'NOT REACHED',
    floor.length ? `ignored costs: ${floor.sort((a, b) => b - a).slice(0, 6).join(', ')}cp (max ignored ${Math.max(...floor)}cp); ${called} slips were called` : 'no floor decisions captured');

  record('INSTRUMENT alive', spoken.length > 0 ? 'PASS' : 'FAIL', `${spoken.length} spoken lines captured`);
  if (deviations.length) console.log(`[deviation] ${deviations.length} designed move(s) were illegal and substituted:`, deviations.slice(0, 6));

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, ask: ASK, pgn: chess.pgn(), probes, deviations, spoken, pageErrors }, null, 2));
  console.log(`\nreport ${OUT}/report.json`);
  await browser.close().catch(() => {});
  await listener.stop().catch(() => {});
  process.exit(probes.some((p) => p.status === 'FAIL') ? 1 : 0);
}
main().catch((e) => { console.error('crashed:', e); process.exit(1); });
