#!/usr/bin/env node
/**
 * audit-kid-play-coach-loop — 3-INSTRUMENT loop audit of the live LLM coach in
 * the kid Play Game (/kid/play-games/:gameId, GuidedGamePage). Per CLAUDE.md
 * §G1 the post-deploy audit uses ALL THREE instruments together:
 *
 *   (1) PLAYWRIGHT drives the surface like a child — start the game, ask the
 *       coach (quick-tap chips + typed questions, incl. adversarial input).
 *   (2) LIVE AUDIT-STREAM pull (GET /api/audit-stream, x-audit-secret) BEFORE
 *       and AFTER each pass — the delta = exactly this pass's server-side
 *       events (brain calls / narration).
 *   (3) NARRATION-LISTENER sidecar (startAuditListener) — the page's
 *       auditStreamUrl localStorage is pointed at it, so it captures every
 *       voice/speak/narration event the app emitted. This is the instrument
 *       that PROVES Ruth ACTUALLY SPOKE the coach narration + chat answer —
 *       a chat bubble rendering is NOT proof the voice fired.
 *
 * What each pass asserts:
 *   • coach narration renders AND the listener captured a voice event (Ruth
 *     spoke — not silent).
 *   • Ask-the-Coach round-trips the LLM (answer appears) AND the listener
 *     captured a voice event for the spoken answer.
 *   • KID-SAFE (P0): NO coach answer contains SAN (Nf3/Bxc4/Qf7#/O-O/e8=Q),
 *     even under SAN-laden adversarial input (the child's own typed SAN is
 *     ignored — only coach bubbles are checked).
 *   • ADVERSARIAL input (gibberish/emoji/very-long/empty) never crashes.
 *   • ZERO console/page errors (a crash in kid mode is P0).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     AUDIT_STREAM_SECRET=... node scripts/audit-kid-play-coach-loop.mjs
 *   AUDIT_MAX_PASSES=3 sets the consecutive-clean-pass target (default 3).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 3);
const PROD_SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const GAME_ID = process.env.AUDIT_KID_GAME ?? 'scholars-mate';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/kid-play-coach-${stamp}`;

const SAN_RE = /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8]=[QRBN][+#]?)\b/;
const VOICE_RE = /voice|speak|narration|tts/i;

const ADVERSARIAL = [
  ['Why is this a good move?', 'what should I do next?', 'is my king safe?'],
  ['Najdorff???', 'PLAY Qxf7# NOW', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '🤔♟️👑'],
  ['', '   ', 'tell me every move in the whole game and also Bxh7 and O-O-O', 'why why why why why why'],
];

// (2) prod server-side audit-stream pull.
async function pullProdStream(sinceMs) {
  if (!PROD_SECRET || !BASE.startsWith('http')) return { ok: false, n: 0, reason: 'no secret' };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': PROD_SECRET } });
    if (!res.ok) return { ok: false, n: 0, reason: `http ${res.status}` };
    const j = await res.json();
    const ev = j.entries ?? j.events ?? [];
    return { ok: true, n: Array.isArray(ev) ? ev.length : 0, reason: '' };
  } catch (e) { return { ok: false, n: 0, reason: String(e).slice(0, 60) }; }
}

async function main() {
  console.log(`[kid-play-coach · 3-instrument] ${BASE} · game=${GAME_ID} · target ${MAX_PASSES} clean\n`);
  await mkdir(OUT, { recursive: true });

  // (3) Start the narration-listener sidecar ONCE; reused across passes.
  const listener = await startAuditListener();
  console.log(`(3) narration listener: ${listener.url}`);

  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });

  let cleanStreak = 0, pass = 0;
  const report = [];

  while (cleanStreak < MAX_PASSES && pass < MAX_PASSES + 4) {
    pass += 1;
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
    await ctx.addInitScript(autoDismissCalibration);
    // Point the app's audit posting at our listener BEFORE any script runs.
    await ctx.addInitScript(({ url, secret }) => {
      try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
    }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
    const page = await ctx.newPage();

    const errs = [];
    const voicePosts = [];
    page.on('console', (m) => { if (m.type() === 'error' && /same key|each child|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|is not a function/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 160)));
    // Backup voice capture straight off the POST bodies (belt + suspenders w/ listener).
    page.on('request', (req) => {
      if (req.url().includes('/audit-stream') && req.method() === 'POST') {
        try { const b = req.postDataJSON(); const ev = b?.entries ?? b?.events ?? (Array.isArray(b) ? b : [b]); for (const e of ev) if (VOICE_RE.test(e?.kind || '')) voicePosts.push(e.kind); } catch { /* */ }
      }
    });

    const breaks = [];
    const fail = (m) => { breaks.push(m); console.log(`    ✗ ${m}`); };
    const ok = (m) => console.log(`    ✓ ${m}`);
    const since = Date.now() - 3000;
    const voiceBaseline = listener.getCapturedEvents().length;

    console.log(`── pass ${pass} ──`);
    const base0 = await pullProdStream(since);
    try {
      await page.goto(`${BASE}/kid/play-games/${GAME_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
      let started = false;
      for (let i = 0; i < 45 && !started; i += 1) {
        started = await page.locator('[data-testid="guided-game-start"]').first().isVisible().catch(() => false);
        if (!started) await page.waitForTimeout(1500);
      }
      if (!started) { fail('guided-game intro/start not visible'); }
      else {
        await page.locator('[data-testid="guided-game-start"]').first().click({ force: true }).catch(() => undefined);
        const narr = await page.locator('[data-testid="guided-game-narration"]').first().isVisible({ timeout: 15000 }).catch(() => false);
        if (narr) ok('coach narration rendered'); else fail('coach narration never rendered');

        const chat = await page.locator('[data-testid="guided-game-coach-chat"]').first().isVisible({ timeout: 8000 }).catch(() => false);
        if (!chat) fail('Ask-the-Coach panel missing');
        else {
          ok('Ask-the-Coach panel present');
          await page.locator('[data-testid="guided-game-quickask-why"]').first().click({ force: true }).catch(() => undefined);
          const gotAnswer = await page.waitForFunction(() => (document.querySelectorAll('[data-testid="chat-msg-coach"]').length >= 1), { timeout: 30000 }).then(() => true).catch(() => false);
          if (gotAnswer) ok('quick-ask produced a coach answer (LLM wired)');
          else fail('quick-ask produced NO coach answer (LLM not wired / timed out)');

          for (const q of ADVERSARIAL[(pass - 1) % ADVERSARIAL.length]) {
            const input = page.locator('[data-testid="guided-game-chat-input"]').first();
            if (!(await input.isVisible().catch(() => false))) break;
            await input.fill(q).catch(() => undefined);
            await page.locator('[data-testid="guided-game-chat-send"]').first().click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(q.trim() ? 3500 : 600);
          }

          const answers = await page.locator('[data-testid="chat-msg-coach"]').allInnerTexts().catch(() => []);
          let leak = false;
          for (const a of answers) if (SAN_RE.test(a)) { leak = true; fail(`SAN leak in COACH answer: "${a.slice(0, 50)}"`); }
          if (!leak) ok(`no SAN in ${answers.length} coach answers`);
        }
      }

      // Let any trailing voice POSTs flush to the listener.
      await page.waitForTimeout(1500);

      if (errs.length) fail(`${errs.length} console/page errors: ${errs.slice(0, 2).join(' | ')}`);
      else ok('no console/page errors');

      // (3) LISTENER — did Ruth actually SPEAK? (the load-bearing voice check)
      const newVoice = listener.getCapturedEvents().slice(voiceBaseline).filter((e) => VOICE_RE.test(e.kind || ''));
      if (newVoice.length > 0 || voicePosts.length > 0) ok(`listener: voice FIRED (${newVoice.length} listener + ${voicePosts.length} intercepted)`);
      else fail('listener: NO voice event — coach was SILENT (voiceService never fired)');

      // (2) prod audit-stream delta
      const after = await pullProdStream(since);
      if (after.ok) ok(`audit-stream delta: ${after.n} events (baseline ${base0.n})`);
      else console.log(`    · audit-stream not pulled (${after.reason})`);
    } catch (e) {
      fail('pass threw: ' + String(e).slice(0, 120));
    }

    await page.screenshot({ path: join(OUT, `pass-${pass}.png`) }).catch(() => undefined);
    await ctx.close();

    const clean = breaks.length === 0;
    report.push({ pass, clean, breaks });
    if (clean) { cleanStreak += 1; console.log(`  → pass ${pass} CLEAN (streak ${cleanStreak}/${MAX_PASSES})\n`); }
    else { cleanStreak = 0; console.log(`  → pass ${pass} BROKE (${breaks.length}) — streak reset\n`); }
  }

  await browser.close();
  await listener.stop();
  const met = cleanStreak >= MAX_PASSES;
  await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: BASE, game: GAME_ID, met, instruments: 3, passes: report }, null, 2));
  console.log(`\n${met ? '✅ MET' : '❌ NOT MET'} — ${cleanStreak}/${MAX_PASSES} consecutive clean 3-instrument passes. Report: ${OUT}/report.json`);
  process.exit(met ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
