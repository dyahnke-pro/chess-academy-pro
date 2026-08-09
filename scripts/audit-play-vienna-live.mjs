#!/usr/bin/env node
// Play a REAL game in Learn with Coach and read back everything it said.
//
// David 2026-08-09: "You need to run an actual game in play with coach. Not a
// teach me x opening, but play an opening you know and evaluate the responses."
//
// LEARN WITH COACH (/coach/teach) — the surface every change tonight landed on.
// A game here is meant to be talked through: corpus teaching first, then
// tactics, gems, threats (David's order), with no budget on the utterance. This
// drives a real game and reads back what was actually said, per move.
//
// MUTED. `muteTtsForAudit` sets localStorage.auditMuteTts, so voiceService
// emits the same `coach-narration-spoken` event with the same full text and
// skips every synthesis tier — identical signal, zero TTS spend (the locked
// rule after a 3-instrument audit ran $100 over in a day).
//
// Instruments, per §G1, adapted for https prod:
//   1. Playwright drives the board by hand (click-to-move; drag is unreliable
//      headless).
//   2. The prod audit-stream is pulled before and after, so the delta is
//      exactly this run.
//   3. PostHog is stamped with an `audit_run_id` — the narration listener
//      cannot attach over https (mixed content), and PostHog carries the FULL
//      untruncated narration text where the Vercel stream strips it.
//
// Board truth is checked HERE, in node, with chess.js: every square the coach
// names must hold what it says it holds. That is the only assertion that
// matters — "an element appeared" is worthless.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `play-vienna-${Math.random().toString(36).slice(2, 10)}`;
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const OUT = `audit-reports/play-vienna-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// THE VIENNA GAMBIT — an opening we teach, so the coach has both curated beats
// and corpus notes for it. If it is going to speak anywhere, it is here.
//
// The student is BLACK. "Play X against me" hands the opening to the COACH
// (David 2026-08-09: "Ask it to play a certain opening against you"), so the
// coach opens with the Vienna and this answers it.
//
// PREFERENCES, NOT A SCRIPT. A fixed move list breaks the moment the coach
// deviates, and then the audit reports "coach went off-book" as if that were
// the finding. Each turn plays the first of these that is legal — a sane Black
// setup against a king's-pawn opening, whatever White actually does.
const STUDENT_PREFS = [
  'e5', 'Nf6', 'd5', 'Nxe4', 'Nc6', 'Be7', 'O-O', 'd6', 'Bg4', 'Nxd4',
  'Bd6', 'Re8', 'c6', 'Qe7', 'Bf5', 'Nd7', 'h6', 'a6', 'Rb8', 'Kh8',
];
const MAX_PLIES = 10;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** The board as the DOM shows it: square → "wP"-style piece code. There is no
 *  data-fen on this surface, so the placement IS the board. */
const readPlacement = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    const name = sq.getAttribute('data-square');
    if (p && name) out[name] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

const samePlacement = (a, b) => {
  const ka = Object.keys(a); const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

const placementOf = (fen) => {
  const c = new Chess(fen);
  const out = {};
  for (const row of c.board()) for (const sq of row) {
    if (sq) out[sq.square] = `${sq.color}${sq.type.toUpperCase()}`;
  }
  return out;
};

async function pullStream(since) {
  if (!SECRET) return [];
  try {
    const r = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    if (!r.ok) return [];
    const j = await r.json();
    return j.events ?? j.entries ?? [];
  } catch { return []; }
}

/** Every square the text names, with what it claims sits there. */
function boardClaims(text) {
  const out = [];
  const re = /\b(king|queen|rook|bishop|knight|pawn)\s+on\s+([a-h][1-8])\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ piece: m[1].toLowerCase(), square: m[2].toLowerCase() });
  return out;
}
const LETTER = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function falseClaims(text, fen) {
  const chess = new Chess(fen);
  const bad = [];
  for (const c of boardClaims(text)) {
    const at = chess.get(c.square);
    if (!at) bad.push(`${c.piece} on ${c.square} — square is EMPTY`);
    else if (LETTER[at.type] !== c.piece) bad.push(`${c.piece} on ${c.square} — actually a ${LETTER[at.type]}`);
  }
  return bad;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const before = Date.now() - 60_000;
  const preEvents = await pullStream(before);
  console.log(`[stream] pre-run: ${preEvents.length} events`);
  console.log(`[audit-run-id] ${RUN_ID}`);

  const executablePath = await resolveChromiumExecutable();
  console.log(`[chromium] ${executablePath}`);
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(`localStorage.setItem('auditRunId', ${JSON.stringify(RUN_ID)});`);

  const page = await ctx.newPage();
  const pageErrors = [];
  const spoken = [];
  const rawPayloads = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  // The app posts its audit events; capture narration as it happens rather
  // than relying on a listener that cannot attach over https.
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit')) return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      rawPayloads.push(body);
      for (const e of (body.events ?? body.entries ?? [body])) {
        if (String(e.kind ?? '').includes('narration') || String(e.kind ?? '').includes('voice')) {
          spoken.push({ kind: e.kind, source: e.source, text: e.narrationText ?? e.summary, fen: e.fen });
        }
      }
    } catch { /* not our payload */ }
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // FIRST-RUN OVERLAYS. They render LATE and in no guaranteed order, so a
  // single isVisible() pass races them — the calibration bubble appeared after
  // the pass and then intercepted every click for 30s. Poll instead, and wait
  // for the calibration bubble to DETACH (its applyStrength is async).
  const OVERLAYS = [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
    ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
  ];
  const deadline = Date.now() + 45_000;
  for (;;) {
    let acted = false;
    for (const [gate, btn] of OVERLAYS) {
      const g = page.locator(gate);
      if (await g.isVisible().catch(() => false)) {
        console.log(`[overlay] dismissing ${gate}`);
        await page.locator(btn).first().click({ timeout: 6000 }).catch(() => {});
        await g.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
        acted = true;
      }
    }
    if (!acted) {
      // Nothing showing right now — give a late one a moment to appear, then stop.
      await sleep(1500);
      const anyLeft = await Promise.all(OVERLAYS.map(([g]) => page.locator(g).isVisible().catch(() => false)));
      if (!anyLeft.some(Boolean)) break;
    }
    if (Date.now() > deadline) { console.log('[overlay] gave up waiting'); break; }
  }

  // ASK FOR THE GAME the way a student would. `pressSequentially`, not
  // `fill` — the React textarea needs real key events or the send stays
  // disabled and the message never submits (locked coach-audit rule).
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 45_000 });
  await input.click();
  await input.pressSequentially('play the Vienna Gambit against me', { delay: 25 });
  await page.keyboard.press('Enter');
  console.log('[ask] "play the Vienna Gambit against me"');

  // The ask can land on a line picker; take the PLAY mode when offered.
  await sleep(6000);
  const picker = page.locator('[data-testid="line-picker-mode-play"]');
  if (await picker.isVisible().catch(() => false)) {
    await picker.first().click({ timeout: 5000 }).catch(() => {});
    console.log('[picker] chose play mode');
    await sleep(3000);
  }
  const blackBtn = page.locator('[data-testid="color-black-btn"]');
  if (await blackBtn.isVisible().catch(() => false)) {
    await blackBtn.first().click({ timeout: 5000 }).catch(() => {});
    console.log('[color] chose black');
    await sleep(3000);
  }

  // Wait for a playable board (generation can be slow cold).
  await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 90_000 });
  await sleep(4000);

  const chess = new Chess();
  const transcript = [];
  let ply = 0;

  // THE COACH MOVES FIRST. It has White, so read its opening move off the
  // board before the student answers — otherwise the mirror is a move behind
  // and every reply after it fails to resolve.
  {
    const opened = await readPlacement(page);
    for (const m of chess.moves({ verbose: true })) {
      const probe = new Chess(chess.fen());
      probe.move(m.san);
      if (samePlacement(placementOf(probe.fen()), opened)) { chess.move(m.san); break; }
    }
    console.log(`[open] coach played ${chess.history().at(-1) ?? '(nothing yet — waiting)'}`);
    if (chess.history().length === 0) {
      // It may still be thinking. Give it the cold-boot budget once.
      const deadlineOpen = Date.now() + 90_000;
      while (Date.now() < deadlineOpen && chess.history().length === 0) {
        await sleep(3000);
        const now = await readPlacement(page);
        for (const m of chess.moves({ verbose: true })) {
          const probe = new Chess(chess.fen());
          probe.move(m.san);
          if (samePlacement(placementOf(probe.fen()), now)) { chess.move(m.san); break; }
        }
      }
      console.log(`[open] after wait: ${chess.history().at(-1) ?? 'STILL NOTHING — the coach never opened'}`);
    }
  }

  while (ply < MAX_PLIES) {
    const legal = STUDENT_PREFS
      .map((want) => chess.moves({ verbose: true }).find((m) => m.san.replace(/[+#]/g, '') === want))
      .find(Boolean);
    if (!legal) { transcript.push({ note: 'no preferred move is legal here — stopping' }); break; }

    const spokenBefore = spoken.length;
    await page.locator(`[data-square="${legal.from}"]`).first().click({ timeout: 5000, force: true });
    await page.waitForTimeout(200);
    await page.locator(`[data-square="${legal.to}"]`).first().click({ timeout: 5000, force: true });
    chess.move(legal.san);
    ply += 1;

    // WAIT PROPERLY FOR THE REPLY. Six seconds was my own bug: Stockfish is a
    // Web Worker that can take 45s+ to boot cold (and this environment logs
    // `stockfish-analysis-stalled` before falling back to the single-threaded
    // variant). Poll the board instead of guessing a duration.
    const wantReply = ply === 1 ? 120_000 : 45_000;
    const replyDeadline = Date.now() + wantReply;
    const beforePlacement = await readPlacement(page);
    while (Date.now() < replyDeadline) {
      await sleep(2500);
      const now = await readPlacement(page);
      if (!samePlacement(now, beforePlacement)) break;
    }

    // READ THE BOARD FROM THE DOM. There is no data-fen on this surface (I
    // checked rather than assumed the second time) — squares are
    // [data-square] and each holds a [data-piece] descendant like "bN". The
    // coach's reply is the one legal move that reproduces that placement.
    const placement = await readPlacement(page);
    let replySan = null;
    if (Object.keys(placement).length > 0) {
      for (const m of chess.moves({ verbose: true })) {
        const probe = new Chess(chess.fen());
        probe.move(m.san);
        if (samePlacement(placementOf(probe.fen()), placement)) { replySan = m.san; break; }
      }
      if (replySan) chess.move(replySan);
    }

    const said = spoken.slice(spokenBefore);
    const checked = said.map((s) => ({
      ...s,
      falseClaims: s.text ? falseClaims(s.text, s.fen ?? chess.fen()) : [],
    }));
    transcript.push({ ply, studentMove: legal.san, coachReply: replySan, fen: chess.fen(), said: checked });
    console.log(`\n[${ply}] you: ${legal.san}${replySan ? `   coach: ${replySan}` : '   coach: (no reply read)'}`);
    if (checked.length === 0) console.log('     (silent)');
    for (const s of checked) {
      console.log(`     🔊 [${s.source}] ${String(s.text ?? '').slice(0, 200)}`);
      for (const f of s.falseClaims) console.log(`     ❌ FALSE: ${f}`);
    }
  }

  await page.screenshot({ path: `${OUT}/final.png`, fullPage: true }).catch(() => {});
  await browser.close();

  await sleep(3000);
  const postEvents = await pullStream(before);
  const delta = postEvents.length - preEvents.length;

  const allFalse = transcript.flatMap((t) => (t.said ?? []).flatMap((s) => s.falseClaims ?? []));
  const totalSpoken = transcript.reduce((n, t) => n + (t.said?.length ?? 0), 0);
  const report = {
    runId: RUN_ID, base: BASE, pliesPlayed: ply,
    linesSpoken: totalSpoken, falseClaims: allFalse, pageErrors,
    streamDelta: delta, transcript,
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${OUT}/raw-audit-payloads.json`, JSON.stringify(rawPayloads.slice(0, 40), null, 2));
  console.log(`raw audit payloads captured: ${rawPayloads.length} → ${OUT}/raw-audit-payloads.json`);

  console.log(`\n──────── SUMMARY ────────`);
  console.log(`plies played        ${ply}`);
  console.log(`lines spoken        ${totalSpoken}`);
  console.log(`FALSE board claims  ${allFalse.length}`);
  console.log(`page errors         ${pageErrors.length}`);
  console.log(`audit-stream delta  ${delta}`);
  console.log(`report              ${OUT}/report.json`);
  console.log(`PostHog: SELECT timestamp, properties.source, properties.narration_text FROM events`);
  console.log(`  WHERE event='coach_narration_spoken' AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);

  process.exit(allFalse.length > 0 || pageErrors.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
