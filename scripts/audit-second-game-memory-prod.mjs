#!/usr/bin/env node
/**
 * audit-second-game-memory-prod — does the coach still TEACH in the session's
 * SECOND game?
 *
 * 🚨 WHY THIS EXISTS, AND WHY THE LEARN AUDIT COULD NOT ANSWER IT.
 * `audit-concept-gameplay-prod` plays two games, so it looks like it covers
 * this. It does not: its `askAndPlay` opens with `page.goto(...)`, so the
 * component REMOUNTS between them and every React ref is fresh. It was green
 * on a build whose second game was silent, and would have stayed green.
 *
 * THE BUG (fixed 2026-09-17, `learnMemory.ts`). CoachTeachPage kept its
 * per-game say-once memory in eighteen refs, with TWO "fresh game" resets that
 * listed different subsets — and TEN refs that neither cleared, for the life of
 * the mount. A fact taught in game 1 was therefore suppressed for every later
 * game in the SAME session: the opening name, the curated beat, the concept
 * invariant, the gem callout. The coach got quieter the longer you played.
 *
 * So the instrument has to be a session, not a page load: ONE mount, two games,
 * and the question is whether the second one still teaches.
 *
 * THE CONTRACT. Game 2 must speak the teaching game 1 spoke. That is not a
 * repetition bug — they are DIFFERENT GAMES, and the say-once rule is scoped to
 * a game by design (see `learnMemory`'s doc). Silence in game 2 is the defect.
 *
 * Muted per G1 (a byte of TTS here would be spend for nobody).
 *
 * Run:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-second-game-memory-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { pickStudentMove } from './audit-lib/student-player.mjs';
import { Chess } from 'chess.js';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ASK = 'Play the Scandinavian Defense, Lasker Variation with me';
const STUDENT_LINE = ['d5', 'Qxd5', 'Qa5', 'Nf6', 'Bg4', 'Nc6'];
const MAX_PLIES = 8;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/second-game-memory-${stamp}`;

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

/** The teaching we track across games. Each is a DIFFERENT ref that nothing
 *  reset before the fix, so each is an independent probe of the same disease. */
const TEACHINGS = [
  // Index 0 is the opening announcement. It is NOT asserted in the per-teaching
  // loop below — it gets its own COMPUTED-vs-SPOKEN pair (D2/D3), because for
  // this one the two answers are different bugs. The regex is still used there.
  { id: 'opening-name', ref: 'announcedOpeningName', re: /this game is now the|the line has sharpened into|you're (?:in|playing) the/i, split: true },
  { id: 'concept-invariant', ref: 'conceptTaught', re: /piece in front|two targets|valuable piece|no safe square/i },
  { id: 'threat-call', ref: 'spokenThreatLines', re: /attacked and nothing's defending|hanging|is attacked/i },
];

const prose = (l) => l.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
  .map((e) => String(e.narrationText));

/** EVERY event summary, so the report can tell "never computed" from
 *  "computed and then not spoken". The first cut of this probe kept only
 *  narrationText events and could not distinguish them — which is the
 *  difference between a selection bug and a memory bug. */
const summaries = (l) => l.getCapturedEvents()
  .map((e) => `${e.kind ?? '?'} :: ${String(e.summary ?? '').slice(0, 140)}`);

const readPlacement = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    const n = sq.getAttribute('data-square');
    if (p && n) out[n] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

const placementOf = (fen) => {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r += 1) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      out['abcdefgh'[file] + String(8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
  }
  return out;
};
const same = (a, b) => Object.keys(a).length === Object.keys(b).length
  && Object.keys(a).every((k) => a[k] === b[k]);

const committed = (l) => l.getCapturedEvents()
  .filter((e) => e.kind === 'coach-turn-checkpoint')
  .map((e) => /san=(\S+)/.exec(String(e.summary ?? ''))?.[1]).filter(Boolean);

async function absorb(page, chess) {
  const now = await readPlacement(page);
  for (const m of chess.moves({ verbose: true })) {
    const probe = new Chess(chess.fen());
    probe.move(m.san);
    if (same(placementOf(probe.fen()), now)) { chess.move(m.san); return m.san; }
  }
  return null;
}

async function dismissGates(page) {
  try {
    const g = page.locator('[data-testid="ai-consent-modal"]');
    await g.waitFor({ timeout: 4000 });
    await page.locator('[data-testid="ai-consent-allow"]').click();
    await g.waitFor({ state: 'detached', timeout: 10_000 });
  } catch { /* not shown */ }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 2500 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

/** Ask for a game and play it. NO navigation — that is the whole point. */
async function playInPlace(page, listener, label) {
  const sansStart = committed(listener).length;
  const proseStart = prose(listener).length;
  const evStart = summaries(listener).length;
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  await input.pressSequentially(ASK, { delay: 12 });
  await page.keyboard.press('Enter');

  const started = Date.now();
  let up = false;
  let tapped = false;
  while (Date.now() - started < 210_000 && !up) {
    const chips = page.locator('[data-testid^="message-choice-chip-"], [data-testid^="coach-choice-chip-"]');
    if (!tapped && (await chips.count()) > 0) {
      const labels = await chips.allInnerTexts();
      const want = labels.findIndex((l) => /Lasker/i.test(l));
      if (want >= 0) {
        tapped = true;
        await chips.nth(want).click({ force: true }).catch(() => {});
        console.log(`[${label}] tapped chip "${labels[want].replace(/\s+/g, ' ').slice(0, 50)}"`);
        await page.waitForTimeout(2500);
        continue;
      }
    }
    if (committed(listener).length > sansStart) { up = true; break; }
    // Fallback: the BOARD itself. A coach opening move is visible whether or
    // not the event reached the sidecar, and an instrument that can only see
    // one of the two reports a product failure when it has a wiring failure.
    if ((await page.locator('[data-square="e4"]').count()) > 0) {
      const pl = await readPlacement(page);
      if (pl.e4 === 'wP' || pl.d4 === 'wP' || pl.c4 === 'wP' || pl.f4 === 'wP') { up = true; break; }
    }
    await page.waitForTimeout(3000);
  }
  if (!up) {
    console.log(`[${label}] no coach move within budget`);
    return { started: false, plies: 0, said: [] };
  }

  const chess = new Chess();
  const openBy = Date.now() + 60_000;
  while (Date.now() < openBy && chess.history().length === 0) {
    if (!(await absorb(page, chess))) await page.waitForTimeout(2500);
  }
  console.log(`[${label}] coach opened ${chess.history().at(-1) ?? '(unread)'}`);

  let onBook = true;
  for (let ply = 0; ply < MAX_PLIES && !chess.isGameOver(); ply += 1) {
    let legal = null;
    if (onBook && ply < STUDENT_LINE.length) {
      const m = chess.moves({ verbose: true }).find((v) => v.san === STUDENT_LINE[ply]);
      if (m) legal = { from: m.from, to: m.to, san: m.san };
      else onBook = false;
    }
    legal ??= pickStudentMove(chess.fen(), chess.history().length);
    if (!legal) break;
    await page.locator(`[data-square="${legal.from}"]`).first().click({ timeout: 8000, force: true }).catch(() => {});
    await page.waitForTimeout(250);
    await page.locator(`[data-square="${legal.to}"]`).first().click({ timeout: 8000, force: true }).catch(() => {});
    chess.move(legal.san);
    if (chess.isGameOver()) break;
    const mine = placementOf(chess.fen());
    const settle = Date.now() + 20_000;
    while (Date.now() < settle && !same(await readPlacement(page), mine)) await page.waitForTimeout(1000);
    const replyBy = Date.now() + 90_000;
    let reply = null;
    while (Date.now() < replyBy && !reply) {
      await page.waitForTimeout(2500);
      reply = await absorb(page, chess);
    }
    if (!reply) break;
  }
  const said = prose(listener).slice(proseStart);
  const events = summaries(listener).slice(evStart);
  console.log(`[${label}] ${chess.history().length} plies — ${chess.history().join(' ')}`);
  console.log(`[${label}] spoke ${said.length} line(s)`);
  return { started: true, plies: chess.history().length, said, events, pgn: chess.pgn() };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  // The listener needs BOTH the url and the SECRET — without the secret the
  // app posts nothing, `committed()` stays empty and the probe reports "no
  // coach move" while a game is plainly running on screen. (Cost me a run.)
  await context.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* blocked */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit); // G1: never a byte of TTS
  await context.addInitScript(stampAuditRunId(`second-game-${Math.random().toString(36).slice(2, 10)}`));
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  let tts = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) tts += 1; });

  let g1 = { started: false, said: [], events: [] };
  let g2 = { started: false, said: [], events: [] };
  try {
    // ONE navigation. Everything after this is the same mount.
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await dismissGates(page);

    g1 = await playInPlace(page, listener, 'game-1');
    record('A. game 1 starts and the coach plays', g1.started && g1.plies > 0, `${g1.plies} plies, ${g1.said.length} lines`);

    // The SECOND game, in the SAME mount — no goto, no reload.
    g2 = await playInPlace(page, listener, 'game-2');
    record('B. game 2 starts in the SAME mount (no reload)', g2.started && g2.plies > 0, `${g2.plies} plies, ${g2.said.length} lines`);

    record(
      'C. game 2 is not MUTE — the coach still narrates the second game',
      g2.said.length > 0,
      `${g2.said.length} spoken lines in game 2 (game 1: ${g1.said.length})`,
    );

    // The per-teaching probes: each rides a DIFFERENT ref that nothing reset.
    for (const t of TEACHINGS.filter((x) => !x.split)) {
      const in1 = g1.said.filter((l) => t.re.test(l));
      const in2 = g2.said.filter((l) => t.re.test(l));
      // Only meaningful where game 1 actually taught it. If it did not, the
      // probe is INCONCLUSIVE, and says so rather than passing vacuously.
      if (in1.length === 0) {
        console.log(`[diag] ${t.id}: game 1 never taught it — nothing to compare`);
        continue;
      }
      // ⚠️ DIAGNOSTIC, NOT A CONTRACT — and the reason matters.
      //
      // These teachings fire in the MIDDLEGAME, where the coach picks its own
      // moves, so the two games reach DIFFERENT boards (measured: `Bf4 O-O-O
      // Qe2` in one game, `a3 O-O-O Bb5` in the other). A tactic that exists on
      // one board and not the other is not a memory failure, and asserting on
      // it made this probe flip red and green between runs of the SAME build —
      // which teaches a reader to ignore the row, the worst thing an instrument
      // can do.
      //
      // The opening announcement (D2/D3) IS controlled: it lands inside the
      // forced opening plies both games share, so it is asserted.
      console.log(
        `[diag] ${t.id}: g1=${in1.length} g2=${in2.length}`
        + (in2.length === 0 ? ' — absent in game 2 (boards diverge; not conclusive)' : ''),
      );
    }

    // ── COMPUTED vs SPOKEN ─────────────────────────────────────────────────
    // A silent teaching has two completely different causes, and blaming the
    // wrong one costs a whole fix: a MEMORY that never forgot (so the fact was
    // never computed again), or a DELIVERY that dropped a fact the computer
    // did produce. The first cut of this probe kept only narration text and
    // could not tell them apart — it reported "SILENCED: suppressed for the
    // rest of the session" for a case where the coach recomputed the fact
    // five times and simply never said it.
    const announced = (g) => (g.events ?? []).filter((e) => /opening (identified|refined)/.test(e));
    const c1 = announced(g1).length;
    const c2 = announced(g2).length;
    const spoken2 = g2.said.filter((l) => TEACHINGS[0].re.test(l)).length;
    console.log(`[diag] opening announcements — game 1 computed ${c1}, game 2 computed ${c2}, game 2 SPOKE ${spoken2}`);
    for (const e of announced(g2).slice(0, 4)) console.log(`       g2: ${e}`);
    record(
      'D2. the opening announcement is RECOMPUTED in game 2 (the memory forgot)',
      c2 > 0,
      `game 1 computed ${c1}, game 2 computed ${c2}` + (c2 > 0 && announced(g2)[0].includes('identified')
        ? ' — and game 2 says "identified", not "refined", so the name really was forgotten' : ''),
    );
    record(
      'D3. and it is actually SPOKEN in game 2 (delivery, not memory)',
      spoken2 > 0,
      spoken2 > 0
        ? `${spoken2} spoken`
        : `computed ${c2}x, spoken 0x — the fact reaches queueSpokenHint and is dropped before the voice. `
          + 'NOT a memory bug: the refs reset correctly. Something session-lived downstream of the '
          + 'queue is swallowing it (behaviourScheduler stride and the pendingVoice consumer are the '
          + 'open suspects).',
    );

    record('E. the run stayed MUTED (zero /api/tts)', tts === 0, `${tts} tts requests`);
    record('F. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close().catch(() => {});
    await listener.stop();
  }

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), baseUrl: BASE_URL, ask: ASK,
    results, game1: g1, game2: g2, pageErrors,
  }, null, 2));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => { console.error('audit crashed:', err); process.exit(1); });
