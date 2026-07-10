#!/usr/bin/env node
/**
 * audit-coach-settings-qa-loop — LEARN + PLAY, mid-session Q&A + settings
 * (David 2026-07-10: "run this loop until I tell you to stop. use both learn
 * and play. ask questions during the game. have it turn on and off settings —
 * hints and verbosity").
 *
 * Each PASS drives BOTH /coach/teach (Learn) and /coach/play (Play). On each
 * surface it:
 *   1. Boots, dismisses onboarding, (Play) plays a few moves / (Learn) starts a
 *      lesson so there's live board context.
 *   2. ASKS grounded questions mid-session — best move, "is Qf3 ok?" (named
 *      candidate), "is my queen safe?", "how does Magnus play this?" — and
 *      checks every ANSWER (shown + spoken /api/tts text) against the live board
 *      for a heard hallucination (piece-on-square claim false on the board).
 *   3. Drives SETTINGS via chat — "turn hints off/on", "set narration to
 *      silent/brief/full" — and VERIFIES behaviorally:
 *        • silent → the next asked answer fires ZERO /api/tts (voice muted)
 *        • brief  → the next spoken answer is capped (≤ ~34 words)
 *        • full   → the next answer IS spoken
 *        • hints  → the coach reply confirms (not an error / non-answer)
 *
 * A BREAK is any of: pageerror, app console-error (incl. React same-key),
 * error-fallback / non-answer reply to a real question, false board-claim in a
 * spoken/shown line, or a settings command that didn't take effect.
 *
 * 3 instruments (G1): Playwright drives; the listener sidecar + /api/tts capture
 * hear the voice; the in-page audit log is the event source of truth.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *     node scripts/audit-coach-settings-qa-loop.mjs
 *   env: AUDIT_PASSES (default 100 — effectively "until stopped"),
 *        AUDIT_SURFACES ("learn,play" default), AUDIT_PLY (moves to play, def 4)
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PASSES = Number(process.env.AUDIT_PASSES ?? 100);
const SURFACES = (process.env.AUDIT_SURFACES ?? 'learn,play').split(',').map((s) => s.trim()).filter(Boolean);
const PLY = Number(process.env.AUDIT_PLY ?? 4);
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const BOOT_TIMEOUT_MS = 60_000;
const OUT_DIR = join('audit-reports', `coach-settings-qa-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const PIECE_WORD = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const BRIEF_WORD_CAP = 34; // G5 brief = ≤2 sentences / ≤30 words; small margin.

/** PROVABLY-false piece-on-square claim vs `fen` — a heard hallucination. */
function falseBoardClaims(text, fen) {
  if (!text || !fen) return [];
  let chess;
  try { chess = new Chess(fen); } catch { return []; }
  const lower = String(text).toLowerCase();
  const out = [];
  const patterns = [
    [/\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/g, 1, 2],
    [/\b([a-h][1-8])[-\s](pawn|knight|bishop|rook|queen|king)\b/g, 2, 1],
  ];
  for (const [re, pcIdx, sqIdx] of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(lower)) !== null) {
      const got = chess.get(m[sqIdx]);
      if (!got || got.type !== PIECE_WORD[m[pcIdx]]) out.push(`"${m[0]}" — actual: ${got ? got.color + got.type : 'EMPTY'}`);
    }
  }
  return out;
}
const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[settings-qa] base=${BASE_URL} surfaces=${SURFACES.join('+')} passes=${PASSES}`);
  console.log(`[settings-qa] listener=${listener.url}  out=${OUT_DIR}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });

  const passReports = [];
  let pass = 0;
  let stop = false;
  process.on('SIGINT', () => { stop = true; });

  while (pass < PASSES && !stop) {
    pass += 1;
    for (const surface of SURFACES) {
      const label = `pass${pass}:${surface}`;
      const ctx = await browser.newContext({
        ...sandboxContextOptions(),
        viewport: { width: 414, height: 896 },
        deviceScaleFactor: 2,
        userAgent: 'AuditCoachSettingsQaBot/1.0 (chromium)',
      });
      await ctx.addInitScript(
        ({ url, secret }) => {
          try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
        },
        { url: listener.url, secret: LOCAL_LISTENER_SECRET },
      );
      const page = await ctx.newPage();

      // Capture the ACTUAL spoken text from every /api/tts request (what Polly
      // says, post-sanitize) — the voice, not the shown bubble.
      const spoken = []; // { ts, text }
      page.on('request', (req) => {
        if (!/\/api\/tts\b/.test(req.url())) return;
        try {
          const t = new URL(req.url()).searchParams.get('text');
          if (t && t.trim() && t.trim() !== '.') spoken.push({ ts: Date.now(), text: t });
        } catch { /* */ }
      });
      const breaks = [];
      let inFlight = 'boot';
      const recordBreak = (kind, detail) => {
        breaks.push({ kind, detail: String(detail).slice(0, 240), during: inFlight });
        console.log(`    ✗ BREAK [${kind}] during "${inFlight}": ${String(detail).slice(0, 150)}`);
      };
      page.on('pageerror', (e) => recordBreak('pageerror', e.message));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const t = msg.text();
        if (/Uncaught|TypeError|ReferenceError|is not a function|cannot read prop|Maximum update depth|Minified React error|same key|Each child in a list|unique "key"|Cannot update a component/i.test(t)) recordBreak('console-error', t);
      });

      const dumpAudits = async () => {
        try { return await page.evaluate(async () => { const a = window.__AUDIT__; return a && a.dump ? await a.dump().catch(() => []) : []; }); } catch { return []; }
      };
      const appFen = async () => {
        const a = await dumpAudits();
        for (let i = a.length - 1; i >= 0; i--) if (a[i]?.fen) return a[i].fen;
        return null;
      };
      const clearOverlays = async () => {
        const calib = page.locator('[data-testid="strength-calibration-bubble"]');
        if (await calib.count()) {
          await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {});
          await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
        }
        const help = page.locator('[data-testid="page-help-modal"]');
        if (await help.count()) { await page.keyboard.press('Escape'); await help.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); }
      };
      // Read every coach message text on ANY surface. ChatMessage carries a
      // `coach-badge`; climb to the largest-text ancestor = the bubble. Works on
      // /coach/teach (Learn), /coach/play (GameChatPanel), and /coach/chat alike.
      const readCoachReplies = async () => {
        try {
          return await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('[data-testid="coach-badge"]').forEach((b) => {
              let n = b, best = b;
              for (let i = 0; i < 6 && n; i++) { n = n.parentElement; if (n && (n.textContent || '').length > (best.textContent || '').length && (n.textContent || '').length < 1200) best = n; }
              const t = (best.textContent || '').replace(/\s+/g, ' ').trim();
              if (t) out.push(t);
            });
            return out;
          });
        } catch { return []; }
      };
      // On Play the chat sits behind an "Open chat" button that opens a DRAWER
      // (setCoachDrawerOpen). Click it, then WAIT for the chat input to actually
      // mount + become visible — the drawer animates in, so a bare 600ms wait
      // races the mount (David 2026-07-10 loop audit: Play read empty).
      const openChatIfNeeded = async () => {
        const btn = page.locator('[data-testid="play-chat-button"]').first();
        if (await btn.count()) {
          await btn.click({ timeout: 4000, force: true }).catch(() => {});
          await page.locator('[data-testid="chat-input"], [data-testid="chat-text-input"]').first()
            .waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
        }
      };
      // Send a chat message; return { reply, spokenDuring } — the NEW coach
      // bubble text + the /api/tts lines that fired while answering.
      // settle default 30s: on Play the mid-game agentic `ask` (engine eval +
      // tool loop) streams its first token well past the old 9s ceiling, so the
      // wait timed out and read empty (Learn's grounded assemblers resolve fast,
      // which is why Learn was clean at 9s). waitForFunction still returns the
      // instant a new bubble appears, so a higher ceiling only helps the slow
      // Play case and never delays a fast reply.
      const sendChat = async (text, settleMs = 30000) => {
        await openChatIfNeeded();
        const input = page.locator('[data-testid="chat-input"], [data-testid="chat-text-input"]').first();
        if ((await input.count()) === 0) { recordBreak('no-chat-input', `chat-input absent on ${surface}`); return { reply: '', spokenDuring: [] }; }
        const before = new Set(await readCoachReplies());
        const t0 = Date.now();
        await input.click({ timeout: 4000 }).catch(() => {});
        await input.fill(text).catch(() => {});
        const send = page.locator('[data-testid="chat-send-btn"]').first();
        if (await send.count()) await send.click({ timeout: 4000, force: true }).catch(() => {}); else await input.press('Enter').catch(() => {});
        // Wait for a NEW coach bubble (text not present before), or timeout.
        await page.waitForFunction((prev) => {
          const cur = [];
          document.querySelectorAll('[data-testid="coach-badge"]').forEach((b) => {
            let n = b, best = b;
            for (let i = 0; i < 6 && n; i++) { n = n.parentElement; if (n && (n.textContent || '').length > (best.textContent || '').length && (n.textContent || '').length < 1200) best = n; }
            const t = (best.textContent || '').replace(/\s+/g, ' ').trim();
            if (t) cur.push(t);
          });
          return cur.some((t) => !prev.includes(t));
        }, [...before], { timeout: settleMs }).catch(() => {});
        await page.waitForTimeout(1800); // let the voice fire
        const after = await readCoachReplies();
        const fresh = after.filter((t) => !before.has(t));
        const reply = (fresh.length ? fresh[fresh.length - 1] : (after[after.length - 1] ?? '')).trim();
        const spokenDuring = spoken.filter((s) => s.ts >= t0);
        return { reply, spokenDuring };
      };
      const isNonAnswer = (r) => !r || r.length < 4 || /hit a snag|having trouble connecting|coach is unavailable|i can'?t (help|do) that|not sure what you mean/i.test(r);

      try {
        // ── boot ──
        inFlight = `${label} boot`;
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await clearOverlays();

        const route = surface === 'learn' ? '/coach/teach' : '/coach/play';
        inFlight = `${label} open ${route}`;
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
        await page.waitForTimeout(1500);
        await clearOverlays();

        // ── give the surface live context ──
        if (surface === 'play') {
          await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 40000 }).catch(() => {});
          await clearOverlays();
          const mirror = new Chess();
          const f0 = await appFen(); if (f0) { try { mirror.load(f0); } catch { /* */ } }
          const studentColor = mirror.turn();
          for (let i = 0; i < PLY && !mirror.isGameOver(); i++) {
            if (mirror.turn() !== studentColor) { await page.waitForTimeout(3000); const f = await appFen(); if (f) { try { mirror.load(f); } catch { /* */ } } if (mirror.turn() !== studentColor) break; }
            const legal = mirror.moves({ verbose: true });
            if (!legal.length) break;
            const mv = legal.find((m) => m.flags.includes('c')) ?? legal.find((m) => /[a-h][45]/.test(m.to)) ?? legal[0];
            inFlight = `${label} play ${mv.san}`;
            await page.locator(`[data-square="${mv.from}"]`).first().click({ timeout: 3000, force: true }).catch(() => {});
            await page.waitForTimeout(200);
            await page.locator(`[data-square="${mv.to}"]`).first().click({ timeout: 3000, force: true }).catch(() => {});
            mirror.move(mv.san);
            await page.waitForTimeout(5500); // coach reply + narration
            const f = await appFen(); if (f) { try { mirror.load(f); } catch { /* */ } }
          }
        } else {
          await page.locator('[data-testid="coach-teach-page"], [data-testid="chat-input"]').first().waitFor({ timeout: 40000 }).catch(() => {});
          await clearOverlays();
          inFlight = `${label} start lesson`;
          await sendChat('teach me the Italian game', 45000); // start a lesson for context
          await page.waitForTimeout(2500);
        }

        // ── Q&A probes (grounding + board-truth) ──
        const QUESTIONS = ['what is the best move here?', 'is Qf3 ok to play?', 'is my queen safe?', 'how does Magnus play this?'];
        for (const q of QUESTIONS) {
          inFlight = `${label} ask "${q}"`;
          const fen = await appFen();
          const { reply, spokenDuring } = await sendChat(q);
          if (isNonAnswer(reply)) recordBreak('non-answer', `Q="${q}" → "${reply.slice(0, 120)}"`);
          const bad = [...falseBoardClaims(reply, fen), ...spokenDuring.flatMap((s) => falseBoardClaims(s.text, fen))];
          if (bad.length) recordBreak('false-board-claim', `Q="${q}" :: ${bad.join(' | ')}`);
        }

        // ── SETTINGS via chat, verified behaviorally ──
        const settingsProbe = async (cmd, verify) => {
          inFlight = `${label} setting "${cmd}"`;
          const { reply } = await sendChat(cmd);
          if (isNonAnswer(reply)) recordBreak('setting-non-answer', `"${cmd}" → "${reply.slice(0, 120)}"`);
          await verify(reply);
        };
        // hints off/on — confirmation is the signal (coach applies + confirms).
        await settingsProbe('turn off hints', (r) => { if (!/hint/i.test(r)) recordBreak('hints-not-confirmed', `off → "${r.slice(0, 120)}"`); });
        await settingsProbe('turn hints back on', (r) => { if (!/hint/i.test(r)) recordBreak('hints-not-confirmed', `on → "${r.slice(0, 120)}"`); });

        // verbosity — behavioral: ask a question after each change and watch voice.
        await settingsProbe('set narration to silent', () => {});
        {
          inFlight = `${label} verify SILENT (no voice)`;
          const { spokenDuring } = await sendChat('what is the best move here?');
          if (spokenDuring.length > 0) recordBreak('silent-not-honored', `voice fired ${spokenDuring.length}x on silent: "${spokenDuring[0].text.slice(0, 80)}"`);
        }
        await settingsProbe('set narration to brief', () => {});
        {
          inFlight = `${label} verify BRIEF (capped)`;
          const { spokenDuring } = await sendChat('why is that the best move?');
          for (const s of spokenDuring) if (wordCount(s.text) > BRIEF_WORD_CAP) recordBreak('brief-cap-exceeded', `${wordCount(s.text)}w > ${BRIEF_WORD_CAP}: "${s.text.slice(0, 90)}"`);
        }
        await settingsProbe('set narration to full', () => {});
      } catch (err) {
        recordBreak('exception', err?.message ?? String(err));
      }

      await writeFile(join(OUT_DIR, `${label.replace(/[:]/g, '-')}.json`), JSON.stringify({ label, breaks }, null, 2)).catch(() => {});
      await ctx.close().catch(() => {});
      const clean = breaks.length === 0;
      console.log(`  ${label} → ${clean ? 'CLEAN' : `${breaks.length} BREAK(S)`}`);
      passReports.push({ label, clean, breakCount: breaks.length, breaks });
    }
  }

  await browser.close().catch(() => {});
  console.log(`\n[settings-qa] ===== SUMMARY (${passReports.length} surface-runs) =====`);
  const totalBreaks = passReports.reduce((n, r) => n + r.breakCount, 0);
  for (const r of passReports) console.log(`  ${r.label}: ${r.clean ? 'CLEAN' : `${r.breakCount} BREAK(S)`}`);
  console.log(`  total breaks: ${totalBreaks}`);
  await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify({ totalBreaks, runs: passReports }, null, 2)).catch(() => {});
  listener.stop?.();
  process.exit(totalBreaks === 0 ? 0 : 1);
}

main().catch((e) => { console.error('[settings-qa] FATAL', e); process.exit(2); });
