#!/usr/bin/env node
/**
 * audit-danya-match-learn — Learn free play, replaying ONE of Naroditsky's own
 * games move for move, so what the coach says at each position can be read
 * side by side with what HE taught there (David 2026-09-24: "Try to match this
 * game. You take white. Tell coach what to play against you through the
 * opening").
 *
 * The student plays his White moves on the board; before each one the audit
 * TELLS the coach its Black reply ("play Qa5" → the coach's arm-the-next-reply
 * command), so the game stays on his line for as long as the coach follows the
 * instruction. It waits for the coach to go quiet before typing: typing stops
 * the coach (the student is in control), so an early keystroke would cut off
 * the very narration being compared.
 *
 * Output: audit-reports/danya-match-<stamp>/side-by-side.md — per position, his
 * note (from the voiced corpus) and the coach's spoken lines.
 *
 * Run (MUTED, 3-instrument sidecar):
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-danya-match-learn.mjs
 *   DANYA_VIDEO=1zfJ7ABoh8k (default) · DANYA_MAX_MOVES=17
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { readPlacement, samePlacement, placementOf, clickMove, sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const VIDEO = process.env.DANYA_VIDEO ?? '1zfJ7ABoh8k';
const MAX_MOVES = Number(process.env.DANYA_MAX_MOVES ?? 17);
const OUT = `audit-reports/danya-match-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const corpus = JSON.parse(await readFile('public/data/voiced-teachings.json', 'utf8'));
const allNotes = Array.isArray(corpus) ? corpus : (corpus.notes ?? Object.values(corpus)[0]);
const notes = allNotes
  .filter((n) => (n.id ?? '').startsWith(`vc-${VIDEO}-`))
  .sort((a, b) => Number(a.id.split('-').pop()) - Number(b.id.split('-').pop()));
const line = notes.reduce((best, n) => (n.lineSan.length > best.length ? n.lineSan : best), []);
const noteAt = new Map(notes.map((n) => [n.lineSan.length, n.explains ?? '']));

/** Every line the coach actually SPOKE (muted: the app still emits the text). */
const NOISE = /^(track A spoke|computed |coach move |opening (identified|refined)|injected |voice=|silent|throttled)/i;
const spoken = (listener) => listener.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' || /voice-speak-invoked/.test(e.kind ?? ''))
  .map((e) => (e.narrationText ?? e.summary ?? '').trim())
  .filter((t) => t && !NOISE.test(t));
/** One copy of each line — the audit trail logs the same sentence at several
 *  hops, some truncated; keep the longest reading of each. */
function distinct(lines) {
  const out = [];
  for (const l of lines) {
    const t = l.replace(/^[a-z+\- ]+(\([^)]*\))? — /, '').replace(/\s*""$/, '').trim();
    if (!t || out.some((o) => o.startsWith(t))) continue;
    for (let i = out.length - 1; i >= 0; i -= 1) if (t.startsWith(out[i])) out.splice(i, 1);
    out.push(t);
  }
  return out;
}

async function waitQuiet(listener, quietMs = 4000, maxMs = 45_000) {
  const start = Date.now();
  let last = listener.getCapturedEvents().length;
  let lastChange = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(500);
    const n = listener.getCapturedEvents().length;
    if (n !== last) { last = n; lastChange = Date.now(); }
    if (Date.now() - lastChange >= quietMs) return;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`[danya] video ${VIDEO}: ${notes.length} notes, line of ${line.length} plies`);
  const listener = await startAuditListener();
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(({ url, secret }) => {
    try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(stampAuditRunId(`danya-match-${Math.random().toString(36).slice(2, 8)}`));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count()) await allow.first().click().catch(() => {});
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  await waitQuiet(listener, 3000, 20_000);

  const chess = new Chess();
  const rows = [];
  let offLine = null;
  for (let i = 0; i + 1 < line.length && i / 2 < MAX_MOVES; i += 2) {
    const white = line[i];
    const black = line[i + 1];
    // 1) Tell the coach its reply — only once it has finished talking.
    await waitQuiet(listener);
    for (let t = Date.now(); Date.now() - t < 60_000 && await input.isDisabled().catch(() => false);) await sleep(500);
    await input.pressSequentially(`play ${black}`, { delay: 10 });
    await page.keyboard.press('Enter');
    await sleep(2500);
    const ack = (await page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`[danya] told "play ${black}" → ${ack.slice(0, 120)}`);
    // 2) Play his White move.
    const before = spoken(listener).length;
    const m = chess.move(white);
    const ok = await clickMove(page, m, chess.fen());
    if (!ok) { offLine = `the board did not take ${white}`; break; }
    rows.push({ ply: chess.history().length, san: white, note: noteAt.get(chess.history().length) ?? '', coach: [] });
    // 3) The coach's reply: did it play what it was told?
    const mine = placementOf(chess.fen());
    let reply = null;
    for (let t = Date.now(); Date.now() - t < 60_000 && !reply;) {
      await sleep(1500);
      const now = await readPlacement(page);
      if (samePlacement(now, mine)) continue;
      for (const mv of chess.moves({ verbose: true })) {
        const probe = new Chess(chess.fen()); probe.move(mv.san);
        if (samePlacement(placementOf(probe.fen()), now)) { reply = mv.san; break; }
      }
    }
    await waitQuiet(listener);
    rows[rows.length - 1].coach = distinct(spoken(listener).slice(before));
    if (!reply) { offLine = `no coach reply after ${white}`; break; }
    chess.move(reply);
    rows.push({ ply: chess.history().length, san: reply, note: noteAt.get(chess.history().length) ?? '', coach: [], told: black });
    if (reply.replace(/[+#]/g, '') !== black.replace(/[+#]/g, '')) { offLine = `told ${black}, coach played ${reply}`; break; }
    console.log(`[danya] ${Math.ceil(chess.history().length / 2)}. ${white} ${reply}`);
  }

  const md = [`# Naroditsky vs the coach — video ${VIDEO}`, '', `Line followed: ${chess.history().join(' ')}`, offLine ? `Left his line: ${offLine}` : 'Stayed on his line throughout.', ''];
  for (const r of rows) {
    const num = Math.ceil(r.ply / 2);
    md.push(`## ${num}${r.ply % 2 ? '.' : '…'}${r.san}`);
    if (r.note) md.push(`**Him:** ${r.note}`);
    if (r.coach.length) md.push(`**Coach:** ${r.coach.join(' / ')}`);
    else if (r.ply % 2) md.push('**Coach:** (silent)');
    md.push('');
  }
  await writeFile(`${OUT}/side-by-side.md`, md.join('\n'));
  console.log(md.join('\n'));
  console.log(`[danya] page errors: ${errors.length}`);
  await browser.close();
  await listener.close?.();
}

main().catch((e) => { console.error(e); process.exit(1); });
