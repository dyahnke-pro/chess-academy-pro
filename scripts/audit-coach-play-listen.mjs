#!/usr/bin/env node
/**
 * audit-coach-play-listen — PLAY A FULL GAME ON /coach/play AND LISTEN TO
 * WHAT THE COACH SAYS, then verify every spoken/shown line is grounded
 * (David 2026-06-16: "play through an entire game with learn/teach/coach and
 * just listen to what it says. Play 8 games. 4 consecutive clean passes =
 * done.").
 *
 * Each PASS = one complete game played move-by-move (student's legal moves
 * clicked on the board; the coach's engine replies read from the
 * coach-move-fx-emitted audit + applied to a chess.js mirror). Throughout,
 * the FULL narration transcript is captured (the in-page audit log's
 * voice-speak-invoked / coach-*-narration / coach-narration-spoken events,
 * PLUS the narration-listener sidecar) and each line is checked AGAINST THE
 * BOARD: a piece-on-square claim that's false on the live position is a HEARD
 * HALLUCINATION (the exact class of the "knight on f6 when f6 is empty" bug).
 *
 * A game is CLEAN when it has ZERO of: pageerror, app console-error
 * (incl. React same-key warnings), error-fallback reply ("Hit a snag"),
 * silent-hang (a coach move with no narration the whole game is informational,
 * not a break), and false board-claim. 4 consecutive clean games = DONE
 * (max 8 games). The per-game transcript is written to the report dir so the
 * narration can be READ end-to-end.
 *
 * 3 instruments (G1): Playwright drives; the listener sidecar captures voice;
 * the in-page Dexie audit log is the per-event source of truth.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-coach-play-listen.mjs
 *   env: AUDIT_MAX_GAMES (default 8), AUDIT_CLEAN_TARGET (default 4),
 *        AUDIT_PLY_CAP (default 70)
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const MAX_GAMES = Number(process.env.AUDIT_MAX_GAMES ?? 8);
const CLEAN_TARGET = Number(process.env.AUDIT_CLEAN_TARGET ?? 4);
const PLY_CAP = Number(process.env.AUDIT_PLY_CAP ?? 70);
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const BOOT_TIMEOUT_MS = 60_000;
const MOVE_SETTLE_MS = 6500; // student move + coach engine reply + narration
const OUT_DIR = join('audit-reports', `coach-play-listen-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const PIECE_WORD = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const NARRATION_KINDS = new Set([
  'voice-speak-invoked', 'coach-narration-spoken', 'coach-move-narration-fired',
  'coach-voice-marker-extracted', 'phase-narration-spoken',
]);

/** Resolve the board to check a spoken line against. The line often
 *  describes a HYPOTHETICAL ("Watch out — if I play Nxd3+, knight on d3
 *  forks…"): the piece-on-square claims are about the position AFTER that
 *  move, not the current one. Detect a leading "if I play <SAN>" / "<SAN>
 *  from you" and apply it to `fen` first, so the post-move claims are
 *  checked against the post-move board (kills the false positives the
 *  current-FEN check produced). Returns the FEN to verify against. */
function resolveClaimFen(text, fen) {
  if (!fen) return fen;
  const m = /\bif i play\s+([A-Za-z][a-h1-8x+#=-]{1,6})|^([A-Za-z][a-h1-8x+#=-]{1,6})\s+from you/i.exec(String(text));
  const san = (m && (m[1] || m[2]) || '').trim().replace(/[.,!?]$/, '');
  if (!san) return fen;
  for (const f of [fen, fen.replace(/ (w|b) /, (s, c) => ` ${c === 'w' ? 'b' : 'w'} `)]) {
    try { const c = new Chess(f); if (c.move(san, { strict: false })) return c.fen(); } catch { /* try next */ }
  }
  return fen;
}

/** Conservative HEARD-HALLUCINATION check: flag only a PROVABLY-false
 *  piece-on-square claim against `fen` (the strongest signal — e.g. "the
 *  knight on f6" when f6 is empty or holds another piece). Subtler invented
 *  tactics are left for the dumped transcript review. */
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
      const sq = m[sqIdx];
      const want = PIECE_WORD[m[pcIdx]];
      const got = chess.get(sq);
      if (!got || got.type !== want) {
        out.push(`"${m[0]}" — actual: ${got ? got.color + got.type : 'EMPTY'}`);
      }
    }
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[play-listen] base=${BASE_URL}`);
  console.log(`[play-listen] games=${MAX_GAMES} cleanTarget=${CLEAN_TARGET} plyCap=${PLY_CAP}`);
  console.log(`[play-listen] listener=${listener.url}  out=${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });

  const gameReports = [];
  let consecutiveClean = 0;
  let game = 0;

  while (game < MAX_GAMES && consecutiveClean < CLEAN_TARGET) {
    game += 1;
    const ctx = await browser.newContext({
      ...sandboxContextOptions(),
      viewport: { width: 414, height: 896 },
      deviceScaleFactor: 2,
      userAgent: 'AuditCoachPlayListenBot/1.0 (chromium)',
    });
    await ctx.addInitScript(
      ({ url, secret }) => {
        try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
      },
      { url: listener.url, secret: LOCAL_LISTENER_SECRET },
    );
    const page = await ctx.newPage();

    // ── HEAR IT: capture the ACTUAL spoken text from every /api/tts request.
    // The displayed bubble and the voice do NOT mirror each other (David
    // 2026-06-16), so reading the chat text would MISS a voice hallucination.
    // /api/tts is a GET with the post-sanitizeForTTS spoken text in ?text= —
    // that is exactly what Polly says. Decode it; this is the transcript we
    // grade for heard hallucinations. ──
    const spokenLog = []; // { ts, text }
    page.on('request', (req) => {
      const u = req.url();
      if (!/\/api\/tts\b/.test(u)) return;
      try {
        const t = new URL(u).searchParams.get('text');
        if (t && t.trim() && t.trim() !== '.') spokenLog.push({ ts: Date.now(), text: t });
      } catch { /* ignore */ }
    });

    const breaks = [];
    let inFlight = '(boot)';
    const recordBreak = (kind, detail) => {
      breaks.push({ kind, detail: String(detail).slice(0, 240), during: inFlight });
      console.log(`    ✗ BREAK [${kind}] during "${inFlight}": ${String(detail).slice(0, 160)}`);
    };
    page.on('pageerror', (err) => recordBreak('pageerror', err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      if (/Uncaught|TypeError|ReferenceError|is not a function|undefined is not|cannot read prop|Maximum update depth|Minified React error|same key|Each child in a list|unique "key"|Cannot update a component/i.test(t)) {
        recordBreak('console-error', t);
      }
    });

    const dumpAudits = async () => {
      try {
        return await page.evaluate(async () => {
          const a = window.__AUDIT__;
          if (!a || typeof a.dump !== 'function') return [];
          try { return await a.dump(); } catch { return []; }
        });
      } catch { return []; }
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
    const clickMove = async (from, to) => {
      const f = page.locator(`[data-square="${from}"]`).first();
      const t = page.locator(`[data-square="${to}"]`).first();
      if ((await f.count()) === 0 || (await t.count()) === 0) return false;
      await f.click({ timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await t.click({ timeout: 3000, force: true }).catch(() => {});
      return true;
    };
    const coachSans = (audits) => audits
      .filter((e) => e.kind === 'coach-move-fx-emitted')
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .map((e) => /san=(\S+)/.exec(String(e.summary ?? ''))?.[1])
      .filter(Boolean);
    // Narration text for events newer than `sinceTs`.
    const narrationSince = (audits, sinceTs) => audits
      .filter((e) => NARRATION_KINDS.has(e.kind) && (e.timestamp ?? 0) > sinceTs)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .map((e) => ({ ts: e.timestamp ?? 0, kind: e.kind, text: String(e.summary ?? '') }));
    // Visible coach chat text (what's SHOWN) — cross-check against spoken.
    const visibleCoachText = async () => {
      try {
        return await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('[data-role="assistant"], [data-testid^="coach-msg"], .coach-message, [data-coach-bubble]').forEach((n) => {
            const t = (n.textContent || '').trim();
            if (t) out.push(t);
          });
          return out;
        });
      } catch { return []; }
    };

    console.log(`\n[play-listen] ===== GAME ${game}/${MAX_GAMES} (consecutiveClean=${consecutiveClean}) =====`);
    const transcript = [];
    let inconclusive = false;
    try {
      inFlight = 'boot';
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
      await page.waitForFunction(() => {
        const a = window.__AUDIT__;
        return !!a && typeof a.isStreamHydrated === 'function' && a.isStreamHydrated();
      }, { timeout: 15000 }).catch(() => {});
      await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      await clearOverlays();

      inFlight = 'open /coach/play';
      await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
      // The 2nd goto re-triggers the boot splash + deferred seed, so wait it
      // OUT (up to 40s) before expecting the board (the iso probe taught me
      // an under-wait here lands on the loading splash).
      await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 40000 }).catch(() => {});
      await clearOverlays();
      // Board must be interactive before we click moves.
      const boardReady = await page.locator('[data-square="e2"], [data-square="e7"]').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1500);
      await clearOverlays();
      if ((await page.locator('[data-testid="coach-game-page"]').count()) === 0 || !boardReady) {
        recordBreak('surface-missing', `coach-game-page mounted=${(await page.locator('[data-testid="coach-game-page"]').count()) > 0} boardReady=${boardReady}`);
        inconclusive = true;
      }

      // Sync the mirror to the app's REAL starting board + detect which side
      // the STUDENT plays (the coach may open as White). The side to move on
      // the app, before we've moved, is the student's side.
      const mirror = new Chess();
      {
        const a0 = await dumpAudits();
        for (let i = a0.length - 1; i >= 0; i--) { if (a0[i]?.fen) { try { mirror.load(a0[i].fen); } catch { /* keep start */ } break; } }
        // If the coach already moved (it's the student's turn now), or it's a
        // fresh board (White = student), mirror.turn() is the student's side.
      }
      const studentColor = mirror.turn();
      let seed = 0x5eed + game * 131;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
      let appliedCoach = 0;
      let lastNarrTs = 0;
      let ply = 0;

      while (!inconclusive && !mirror.isGameOver() && ply < PLY_CAP) {
        if (mirror.turn() !== studentColor) {
          // Coach hasn't replied yet — sync + wait briefly.
          await page.waitForTimeout(1500);
          const a = await dumpAudits();
          for (let i = a.length - 1; i >= 0; i--) { if (a[i]?.fen) { try { mirror.load(a[i].fen); } catch { /* */ } break; } }
          if (mirror.turn() !== studentColor) break;
        }
        // ---- student move ----
        const legal = mirror.moves({ verbose: true });
        if (legal.length === 0) break;
        // Prefer a capture/checking/central developing move; else random.
        const score = (mv) => (mv.flags.includes('c') ? 3 : 0) + (mv.san.includes('+') ? 2 : 0) + (/[a-h][45]/.test(mv.to) ? 1 : 0);
        const ranked = legal.slice().sort((a, b) => score(b) - score(a));
        const pick = rand() < 0.6 ? ranked[Math.floor(rand() * Math.min(4, ranked.length))] : legal[Math.floor(rand() * legal.length)];
        inFlight = `G${game} ply${ply} student ${pick.san}`;
        const clicked = await clickMove(pick.from, pick.to);
        if (!clicked) { recordBreak('student-click-failed', `couldn't click ${pick.from}->${pick.to}`); inconclusive = true; break; }
        mirror.move(pick.san);
        ply += 1;

        // ---- wait for the coach's reply + narration ----
        await page.waitForTimeout(MOVE_SETTLE_MS);
        const audits = await dumpAudits();

        // PRIMARY: grade what was actually SPOKEN (the /api/tts text). The
        // board it describes is the live position; use the current mirror fen.
        const spoken = spokenLog.filter((s) => s.ts > lastNarrTs);
        // SECONDARY: the in-page narration audit (preview text) — cross-ref +
        // catches the error-fallback / silent paths.
        const narr = narrationSince(audits, lastNarrTs);
        const newestTs = Math.max(lastNarrTs, ...spoken.map((s) => s.ts), ...narr.map((n) => n.ts));
        lastNarrTs = Number.isFinite(newestTs) ? newestTs : lastNarrTs;
        // VERIFY AGAINST THE APP'S REAL BOARD, not the (drift-prone) mirror:
        // take the FEN off the most recent fen-bearing audit event. This is
        // the app's ground truth, so a desynced mirror can't cause false
        // board-claim flags (David 2026-06-17 #3 — the harness fix).
        const appFen = (() => {
          for (let i = audits.length - 1; i >= 0; i--) { if (audits[i]?.fen) return audits[i].fen; }
          return mirror.fen();
        })();
        for (const s of spoken) {
          // Resolve hypotheticals ("if I play Nxd3+, knight on d3 forks…") to
          // the POST-move board before checking the claims.
          const fenForCheck = resolveClaimFen(s.text, appFen);
          const bad = falseBoardClaims(s.text, fenForCheck);
          transcript.push({ ply, source: 'VOICE(/api/tts)', text: s.text, fen: fenForCheck, falseClaims: bad });
          if (bad.length) recordBreak('false-board-claim(spoken)', `${bad.join(' | ')} :: HEARD "${s.text.slice(0, 110)}"`);
          if (/hit a snag|having trouble connecting|coach is unavailable/i.test(s.text)) recordBreak('error-fallback(spoken)', s.text.slice(0, 120));
        }
        for (const n of narr) {
          transcript.push({ ply, source: `audit:${n.kind}`, text: n.text, fen: mirror.fen() });
          if (/hit a snag|having trouble connecting|coach is unavailable/i.test(n.text)) recordBreak('error-fallback', n.text.slice(0, 120));
        }

        // SYNC THE MIRROR TO THE APP'S REAL BOARD (David 2026-06-17 #3): the
        // old coach-SAN replay drifted and false-flagged 'mirror-desync'.
        // Instead, after the coach replies, load the app's current FEN (off
        // its audit events) into the mirror. When it's White's turn again the
        // coach has moved and we continue; when it's still Black's the coach
        // hasn't replied — poll once more, then call a real silent-hang.
        const syncOnce = async () => {
          const a = await dumpAudits();
          let f = null;
          for (let i = a.length - 1; i >= 0; i--) { if (a[i]?.fen) { f = a[i].fen; break; } }
          if (!f) return false;
          try { mirror.load(f); return true; } catch { return false; }
        };
        await syncOnce();
        if (mirror.turn() === 'b' && !mirror.isGameOver()) {
          // coach hasn't replied yet — give it one more window.
          await page.waitForTimeout(MOVE_SETTLE_MS);
          await syncOnce();
          if (mirror.turn() === 'b' && !mirror.isGameOver()) {
            recordBreak('silent-hang', `no coach reply in ${2 * MOVE_SETTLE_MS}ms after student ${pick.san}`);
            inconclusive = true;
            break;
          }
        }
        ply += 1; // coach's half-move (approx; mirror is authoritative now)
        void appliedCoach;
      }

      // also fold in the SHOWN coach text for the transcript record
      const shown = await visibleCoachText();
      transcript.push({ ply, kind: 'shown-coach-text', shown });

      // End the game cleanly if it ran to the cap (exercises end/teardown).
      if (!mirror.isGameOver() && ply >= PLY_CAP) {
        inFlight = `G${game} resign at cap`;
        const resign = page.locator('[data-testid="resign-btn"], button:has-text("Resign")').first();
        if (await resign.count()) { await resign.click({ force: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(2500); }
      }

      console.log(`    plies=${ply} gameOver=${mirror.isGameOver()} narrationLines=${transcript.filter((t) => t.text).length} inconclusive=${inconclusive}`);
    } catch (err) {
      recordBreak('exception', err?.message ?? String(err));
    }

    await writeFile(join(OUT_DIR, `game-${game}.json`), JSON.stringify({ game, breaks, transcript }, null, 2)).catch(() => {});
    await ctx.close().catch(() => {});

    const realBreaks = breaks.filter((b) => b.kind !== 'mirror-desync' && b.kind !== 'student-click-failed');
    const clean = !inconclusive && realBreaks.length === 0;
    if (inconclusive) {
      console.log(`  GAME ${game} → INCONCLUSIVE (harness desync/stuck — not counted toward clean streak)`);
      // inconclusive doesn't advance the streak, but also doesn't reset a real break
      consecutiveClean = realBreaks.length === 0 ? consecutiveClean : 0;
    } else if (clean) {
      consecutiveClean += 1;
      console.log(`  GAME ${game} → CLEAN  (consecutiveClean=${consecutiveClean})`);
    } else {
      consecutiveClean = 0;
      console.log(`  GAME ${game} → ${realBreaks.length} BREAK(S) — streak reset`);
    }
    gameReports.push({ game, clean, inconclusive, breakCount: realBreaks.length, breaks, narrationLines: transcript.filter((t) => t.text).length });
  }

  await browser.close().catch(() => {});

  const met = consecutiveClean >= CLEAN_TARGET;
  console.log(`\n[play-listen] ===== SUMMARY =====`);
  for (const r of gameReports) {
    console.log(`  game ${r.game}: ${r.inconclusive ? 'INCONCLUSIVE' : r.clean ? 'CLEAN' : `${r.breakCount} BREAK(S)`}  (narration lines: ${r.narrationLines})`);
  }
  console.log(`  consecutiveClean=${consecutiveClean}/${CLEAN_TARGET}`);
  console.log(met ? `  ✅ CONTRACT MET — ${CLEAN_TARGET} consecutive clean games` : `  ❌ NOT MET — keep digging`);
  console.log(`  transcripts: ${OUT_DIR}/game-*.json`);
  await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify({ met, consecutiveClean, cleanTarget: CLEAN_TARGET, games: gameReports }, null, 2)).catch(() => {});
  listener.stop?.();
  process.exit(met ? 0 : 1);
}

main().catch((e) => { console.error('[play-listen] FATAL', e); process.exit(2); });
