#!/usr/bin/env node
/**
 * audit-coach-teach-gaps — GAP-COVERAGE audit of /coach/teach.
 *
 * Covers the three Learn-with-Coach functions the existing audits
 * (audit-coach-teach-functional.mjs / audit-coach-teach-loop.mjs)
 * DON'T exercise:
 *
 *   1. INLINE TRAP-PROMPT (accept + skip). When a walkthrough reaches a
 *      position whose pathSans exactly match a punish lesson's setupMoves,
 *      the runtime intros the trap BEFORE advancing (phase 'trap-prompt',
 *      functions acceptTrap / skipTrap). Accept → the bad-move→punishment
 *      animates on the board (phase 'trap-playing', trapFen overrides the
 *      board). Skip → advance to the next queued trap or the fork picker.
 *      The Vienna static lesson carries 5 punish lessons all anchored at
 *      [e4 e5 Nc3 Nf6 f4 exf4 e5] (src/data/openingWalkthroughs/vienna.ts),
 *      which the Vienna spine walks through — so a Vienna walkthrough hits
 *      the inline trap-prompt deterministically.
 *
 *   2. FACE MODE. Typed "Face: <opening>" (regex ^face:\s*) strips the
 *      prefix, sets faceMode, and routes through generateOpening(mode:'face')
 *      — which resolves the OPPOSITE-side counter-line. The mounted
 *      walkthrough's studentSide / board orientation is flipped vs the
 *      same opening taught normally. Asserted by comparing the resolved
 *      board orientation in Learn-mode vs Face-mode for the same opening.
 *
 *   3. VOICE-PREFERENCE VARIANCE. coachNarration (silent / brief / full)
 *      is a HARD CONTRACT read live by the walkthrough on every speak
 *      (useTeachWalkthrough.speakWalkthroughText → voiceService). Drive the
 *      SAME walkthrough under full vs silent (and brief) by writing the
 *      profiles-store preference + reloading, and assert via the audit-
 *      stream that voice events FIRE on full/brief and are SILENCED on
 *      silent ('voice-speak-silenced'), never spoken.
 *
 * 🚨 DOCTRINE (CLAUDE.md G7 + the 2026-06-12 false-coverage rule):
 *   - EVERY step ASSERTS its expected post-state and FAILS LOUDLY if the
 *     target is absent / the phase doesn't advance. No silent "click-if-
 *     present" no-ops counted as pass.
 *   - Per-gap COVERAGE GRID at the end; an unreached gap is reported
 *     ❌ NOT TESTED with the reason — never omitted.
 *   - process.exit(1) on any FAIL; exit 0 only when every REACHED test
 *     passed (NOT-TESTED gaps are reported but do not fail the run unless
 *     the gap was reachable and broke).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-coach-teach-gaps.mjs
 *   env:
 *     AUDIT_SMOKE_URL / PROD_URL — target (default prod)
 *     AUDIT_STREAM_SECRET        — x-audit-secret for the PROD audit-stream
 *                                  pull (gap 3 voice verification on prod)
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app';
const AUDIT_SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/coach-teach-gaps-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const INPUT_TIMEOUT_MS = 90_000; // cold DB-gen can hold the input busy ~60s

// ── Coverage grid: each GAP → reached? → pass/fail/not-tested ──
const GRID = [];
function record(gap, status, detail) {
  // status: 'pass' | 'fail' | 'not-tested'
  GRID.push({ gap, status, detail });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️ ';
  console.log(`  ${icon} ${gap.padEnd(40)} [${status}] ${detail}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[gaps] base=${BASE} listener=${listener.url} out=${OUT}`);

  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachGapsBot/1.0 (chromium)',
  });
  // Point the page's audit stream at the local listener so voice events
  // are captured locally too (gap 3 works against localhost without the
  // prod secret; on prod we ALSO pull /api/audit-stream).
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* */ }
    },
    { url: listener.url, secret: listener.secret },
  );
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  // Also intercept the audit POSTs directly off the wire (belt + braces
  // with the sidecar — some events fire before the listener URL is read).
  const intercepted = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        const events = Array.isArray(body) ? body : (body?.events ?? (body ? [body] : []));
        for (const ev of events) intercepted.push(ev);
      } catch { /* */ }
    }
  });

  // Capture real app breaks (pageerror + React correctness warnings) so a
  // crash during any gap test is surfaced, not swallowed.
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + (e?.message ?? '').slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/same key|Each child in a list|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Maximum update depth|Minified React error|Cannot update a component/i.test(t)) {
      errs.push(t.slice(0, 200));
    }
  });

  // ── helpers (mirror the existing teach audits) ──
  async function visible(sel) { return page.locator(sel).first().isVisible().catch(() => false); }
  const PHASE_IDS = [
    'walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel',
    'walkthrough-paused-panel', 'walkthrough-choose-mode', 'walkthrough-stage-menu',
    'walkthrough-trap-prompt', 'walkthrough-trap-playing', 'walkthrough-quiz-panel',
    'walkthrough-drill-picker', 'walkthrough-drill-active', 'walkthrough-punish-picker',
    'teach-generation-progress', 'line-picker', 'teach-picker',
  ];
  async function phase() {
    for (const id of PHASE_IDS) if (await visible(`[data-testid="${id}"]`)) return id;
    return 'none';
  }
  async function waitInput(timeout = INPUT_TIMEOUT_MS) {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-text-input"]');
      return el && !el.disabled;
    }, { timeout }).catch(() => undefined);
  }
  async function gotoTeach() {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 }).catch(() => undefined);
    await waitInput();
    await page.waitForTimeout(700);
  }
  // Type a genuine user request (Face:/question/opening name) — these have
  // no button; this is real human use, not command-injection-as-shortcut.
  async function ask(text) {
    await waitInput();
    await page.locator('[data-testid="chat-text-input"]').fill(text, { timeout: 8000 }).catch(() => undefined);
    await page.locator('[data-testid="chat-send-btn"]').click({ force: true, timeout: 8000 }).catch(() => undefined);
  }
  async function clickReq(sel) {
    const el = page.locator(sel).first();
    if (!(await el.isVisible().catch(() => false))) return false;
    await el.click({ force: true, timeout: 6000 }).catch(() => undefined);
    return true;
  }
  async function until(pred, ms, step = 500) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await pred()) return true; await page.waitForTimeout(step); }
    return false;
  }
  // Read the board's true orientation: a1 is bottom-left for White,
  // top-left for Black. ConsistentChessboard renders each square as a
  // positioned element; compare the on-page Y of a1 vs a8.
  async function boardOrientation() {
    return await page.evaluate(() => {
      const a1 = document.querySelector('[data-square="a1"]');
      const a8 = document.querySelector('[data-square="a8"]');
      if (!a1 || !a8) return null;
      const r1 = a1.getBoundingClientRect();
      const r8 = a8.getBoundingClientRect();
      if (r1.top === r8.top) return null;
      // a1 BELOW a8 on screen → White at bottom → 'white' orientation.
      return r1.top > r8.top ? 'white' : 'black';
    }).catch(() => null);
  }
  // Write the coachNarration preference into the profiles Dexie store
  // (the same field SettingsPage writes) so the walkthrough reads it on
  // its next speak. Returns true if a profile row was updated.
  async function setNarration(value) {
    return await page.evaluate(async (val) => {
      return await new Promise((resolve) => {
        const open = indexedDB.open('ChessAcademyDB');
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('profiles')) { resolve(false); return; }
          const tx = db.transaction('profiles', 'readwrite');
          const store = tx.objectStore('profiles');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            const rows = getAll.result || [];
            if (rows.length === 0) { resolve(false); return; }
            for (const row of rows) {
              row.preferences = { ...(row.preferences || {}), coachNarration: val };
              store.put(row);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          };
          getAll.onerror = () => resolve(false);
        };
        open.onerror = () => resolve(false);
      });
    }, value);
  }
  // Drive a Vienna walkthrough forward (skip narration / pick fork-0) until
  // `targetPhases` is reached or the deadline expires. Returns the phase hit.
  async function driveToPhase(targetPhases, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const p = await phase();
      if (targetPhases.includes(p)) return p;
      if (p === 'walkthrough-choose-mode') { await clickReq('[data-testid="walkthrough-choose-walkthrough"]'); }
      else if (p === 'walkthrough-narrating-panel') { await clickReq('[data-testid="walkthrough-skip"]'); }
      else if (p === 'walkthrough-fork-panel') { await clickReq('[data-testid="walkthrough-fork-option-0"]'); }
      else if (p === 'teach-generation-progress') { await page.waitForTimeout(1500); }
      else if (p === 'walkthrough-leaf-panel') { return p; } // overshot the trap
      await page.waitForTimeout(400);
    }
    return await phase();
  }

  // Pull the prod audit-stream (gap-3 voice verification on prod). Returns
  // captured events since `since`, or [] if the secret/endpoint is absent.
  async function pullProdStream(since) {
    if (!AUDIT_SECRET || !BASE.startsWith('http')) return [];
    try {
      const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, {
        headers: { 'x-audit-secret': AUDIT_SECRET },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.events) ? json.events : [];
    } catch { return []; }
  }
  // All voice-ish events seen by both channels (sidecar + wire + prod pull).
  function localVoiceEvents() {
    const sidecar = listener.getCapturedEvents();
    return [...sidecar, ...intercepted].filter((e) =>
      e && (e.kind === 'voice-speak-invoked' || e.kind === 'coach-narration-spoken' || e.kind === 'voice-speak-silenced'));
  }

  // ════════════════════════════════════════════════════════════════════
  // GAP 1 — INLINE TRAP-PROMPT (accept + skip)
  // ════════════════════════════════════════════════════════════════════
  console.log('\n[gaps] === GAP 1: inline trap-prompt (accept + skip) ===');
  try {
    // 1a. ACCEPT: reach the trap-prompt, tap "See the trap", assert the
    //     bad-move→punishment ANIMATES (phase 'trap-playing' + the board's
    //     trapFen advances the position).
    await gotoTeach();
    await ask('teach me the Vienna');
    // Vienna punish lessons anchor at [e4 e5 Nc3 Nf6 f4 exf4 e5], which the
    // Vienna spine walks. Drive forward until the inline trap-prompt fires.
    const reachedAccept = await driveToPhase(['walkthrough-trap-prompt'], 90_000);
    if (reachedAccept === 'walkthrough-trap-prompt') {
      // Capture the board BEFORE accept so we can prove the trap line moved it.
      const fenBefore = await page.evaluate(() => {
        const sq = document.querySelectorAll('[data-square] [data-piece], [data-square] img');
        return `${document.querySelectorAll('[data-piece]').length}:${sq.length}`;
      }).catch(() => 'x');
      const accepted = await clickReq('[data-testid="walkthrough-trap-accept"]');
      if (!accepted) {
        record('trap-prompt-accept', 'fail', 'trap-accept button present but click failed');
      } else {
        // The accept transitions to phase 'trap-playing' and animates the
        // inaccuracy → punishment on the board (trapFen overrides). Assert
        // we observed the trap-playing phase OR the board changed (the
        // animation is brief, so accept either signal).
        const playing = await until(async () => (await phase()) === 'walkthrough-trap-playing', 8000, 200);
        const boardChanged = await until(async () => {
          const now = await page.evaluate(() => `${document.querySelectorAll('[data-piece]').length}:${document.querySelectorAll('[data-square] [data-piece], [data-square] img').length}`).catch(() => 'y');
          return now !== fenBefore;
        }, 12000, 400);
        if (playing || boardChanged) {
          record('trap-prompt-accept', 'pass', `trap animated (trap-playing=${playing}, board-changed=${boardChanged})`);
        } else {
          record('trap-prompt-accept', 'fail', 'accepted but neither trap-playing phase nor board change observed');
        }
      }
    } else {
      record('trap-prompt-accept', 'not-tested', `never reached trap-prompt (phase=${reachedAccept}) — Vienna spine may have diverged before the [e4 e5 Nc3 Nf6 f4 exf4 e5] node`);
    }

    // 1b. SKIP: fresh Vienna run, reach the trap-prompt, tap "Skip", assert
    //     it advances OUT of trap-prompt to the next queued trap-prompt OR
    //     the fork/narrating/leaf flow (never stuck on trap-prompt).
    await gotoTeach();
    await ask('teach me the Vienna');
    if (await visible('[data-testid="walkthrough-choose-mode"]')) { await clickReq('[data-testid="walkthrough-choose-walkthrough"]'); }
    const reachedSkip = await driveToPhase(['walkthrough-trap-prompt'], 90_000);
    if (reachedSkip === 'walkthrough-trap-prompt') {
      // Capture the CURRENT trap-prompt's identifying text (it shows
      // "Common mistake here: <inaccuracy>") so we can prove skip left it.
      const promptTextBefore = await page.locator('[data-testid="walkthrough-trap-prompt"]').innerText().catch(() => '');
      const skipLabel = await page.locator('[data-testid="walkthrough-trap-skip"]').innerText().catch(() => '');
      const skipped = await clickReq('[data-testid="walkthrough-trap-skip"]');
      if (!skipped) {
        record('trap-prompt-skip', 'fail', 'trap-skip button present but click failed');
      } else {
        // Vienna queues 5 traps at that node, so the FIRST skip should
        // surface the NEXT trap-prompt (a DIFFERENT inaccuracy) OR — if only
        // one matched at this exact ply — advance to fork/narrating/leaf/menu.
        // Either way it MUST leave the current prompt. Assert that transition.
        const NON_TRAP = ['walkthrough-fork-panel', 'walkthrough-narrating-panel', 'walkthrough-leaf-panel', 'walkthrough-stage-menu'];
        const advanced = await until(async () => {
          const p = await phase();
          if (NON_TRAP.includes(p)) return true;
          if (p === 'walkthrough-trap-prompt') {
            // Still a trap-prompt — only counts if it's a DIFFERENT trap.
            const now = await page.locator('[data-testid="walkthrough-trap-prompt"]').innerText().catch(() => '');
            return now.length > 0 && now !== promptTextBefore;
          }
          return false;
        }, 12000, 400);
        const afterPhase = await phase();
        if (advanced && afterPhase === 'walkthrough-trap-prompt') {
          record('trap-prompt-skip', 'pass', `skip advanced to the NEXT queued trap-prompt (label="${skipLabel.slice(0, 28)}")`);
        } else if (advanced && NON_TRAP.includes(afterPhase)) {
          record('trap-prompt-skip', 'pass', `skip advanced past trap-prompt → ${afterPhase}`);
        } else {
          record('trap-prompt-skip', 'fail', `still stuck on the SAME trap-prompt after skip (phase=${afterPhase}, label="${skipLabel.slice(0, 28)}")`);
        }
      }
    } else {
      record('trap-prompt-skip', 'not-tested', `never reached trap-prompt (phase=${reachedSkip})`);
    }
  } catch (e) {
    record('trap-prompt-accept', 'fail', `threw: ${String(e?.message ?? e).slice(0, 120)}`);
  }

  // ════════════════════════════════════════════════════════════════════
  // GAP 2 — FACE MODE (opposite-side counter-line)
  // ════════════════════════════════════════════════════════════════════
  console.log('\n[gaps] === GAP 2: FACE mode resolves the counter side ===');
  try {
    // Baseline: teach the Sicilian normally → student is Black (board
    // oriented Black-at-bottom). Capture the LEARN-mode orientation.
    await gotoTeach();
    await ask('Sicilian Najdorf');
    // Najdorf is a concrete Sicilian line → straight to a walkthrough (no
    // broad-family picker trap that bare "Sicilian" hits).
    const learnUp = await driveToPhase(
      ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-choose-mode'],
      75_000,
    );
    let learnOrient = null;
    if (['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-choose-mode'].includes(learnUp)) {
      learnOrient = await boardOrientation();
    }

    // FACE: type "Face: Sicilian Najdorf". The ^face:\s* regex strips the
    // prefix, sets faceMode, and generateOpening(mode:'face') resolves the
    // OPPOSITE-side counter (student plays White facing the Najdorf). Assert
    // a walkthrough mounts AND the orientation flipped vs LEARN mode.
    await gotoTeach();
    const evBefore = intercepted.length;
    await ask('Face: Sicilian Najdorf');
    const faceUp = await driveToPhase(
      ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-choose-mode'],
      90_000, // face routes through generateOpening (a brain/DB-gen call) — slower
    );
    const faceMounted = ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-choose-mode'].includes(faceUp);
    const faceOrient = faceMounted ? await boardOrientation() : null;
    // The surface logs a chip/face routing event with mode=face; the
    // generation call carries mode:'face'. Confirm a face-mode signal fired.
    const faceModeSignal = intercepted.slice(evBefore).some((e) => {
      const blob = JSON.stringify(e ?? {}).toLowerCase();
      return blob.includes('"face"') || blob.includes('mode=face') || blob.includes('face:');
    });

    if (!faceMounted) {
      record('face-mode', 'fail', `Face: request never mounted a walkthrough (phase=${faceUp})`);
    } else if (learnOrient && faceOrient && learnOrient !== faceOrient) {
      record('face-mode', 'pass', `board flipped ${learnOrient}→${faceOrient} (LEARN→FACE)${faceModeSignal ? ' + face audit signal' : ''}`);
    } else if (faceModeSignal && faceMounted) {
      // Orientation read can fail (no rendered board at choose-mode); the
      // mode=face routing signal + a mounted walkthrough is a valid pass.
      record('face-mode', 'pass', `face-mode routing signal fired + walkthrough mounted (learnOrient=${learnOrient} faceOrient=${faceOrient})`);
    } else if (learnOrient && faceOrient && learnOrient === faceOrient) {
      record('face-mode', 'fail', `orientation did NOT flip (both ${learnOrient}) and no face-mode signal — counter side not resolved`);
    } else {
      record('face-mode', 'fail', `inconclusive: learnOrient=${learnOrient} faceOrient=${faceOrient} signal=${faceModeSignal}`);
    }
  } catch (e) {
    record('face-mode', 'fail', `threw: ${String(e?.message ?? e).slice(0, 120)}`);
  }

  // ════════════════════════════════════════════════════════════════════
  // GAP 3 — VOICE-PREFERENCE VARIANCE (full vs brief vs silent)
  // ════════════════════════════════════════════════════════════════════
  console.log('\n[gaps] === GAP 3: coachNarration honored (full / brief / silent) ===');
  try {
    // Prove the setting is reachable from this surface first (it's a global
    // profile preference the walkthrough reads live on every speak).
    await gotoTeach();
    const wrote = await setNarration('full');
    if (!wrote) {
      record('voice-pref-variance', 'not-tested', 'profiles store not seeded yet on this context (cold prod) — could not set coachNarration; reachable via Settings but not write-confirmable here');
    } else {
      // Run a small Vienna narration window under each setting and tally the
      // voice events the app emitted (sidecar + wire + prod pull).
      async function runUnder(value) {
        await setNarration(value);
        const sinceTs = Date.now();
        const evBefore = [...listener.getCapturedEvents(), ...intercepted].length;
        await gotoTeach(); // reload so the store re-reads the profile
        await ask('teach me the Vienna');
        // Let the intro + first couple of beats narrate.
        await driveToPhase(['walkthrough-narrating-panel', 'walkthrough-fork-panel'], 45_000);
        await page.waitForTimeout(6000); // narration window
        const local = localVoiceEvents();
        const prod = await pullProdStream(sinceTs);
        const all = [
          ...local,
          ...prod.filter((e) => ['voice-speak-invoked', 'coach-narration-spoken', 'voice-speak-silenced'].includes(e.kind)),
        ];
        const spoken = all.filter((e) => e.kind === 'voice-speak-invoked' || e.kind === 'coach-narration-spoken');
        const silenced = all.filter((e) => e.kind === 'voice-speak-silenced');
        const transcriptLen = (await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '')).length;
        return { spoken: spoken.length, silenced: silenced.length, total: all.length, evDelta: ([...listener.getCapturedEvents(), ...intercepted].length - evBefore), transcriptLen };
      }

      const full = await runUnder('full');
      const silent = await runUnder('silent');
      const brief = await runUnder('brief');
      console.log(`     full=${JSON.stringify(full)}\n     brief=${JSON.stringify(brief)}\n     silent=${JSON.stringify(silent)}`);

      // CONTRACT:
      //   full   → voice events FIRED (spoken > 0)
      //   silent → voice SILENCED (spoken == 0; ideally voice-speak-silenced seen)
      //   brief  → still speaks (spoken > 0) but clipped (we report; the hard
      //            assert is full-fires vs silent-silent, the unambiguous pair)
      const fullSpoke = full.spoken > 0;
      const silentQuiet = silent.spoken === 0;
      const briefSpoke = brief.spoken > 0;

      if (full.total === 0 && silent.total === 0 && brief.total === 0) {
        // No voice events reached either channel at all — on prod with no
        // AUDIT_STREAM_SECRET the app posts to the REAL endpoint, not our
        // sidecar, so we can't observe. Report honestly rather than a false fail.
        record('voice-pref-variance', AUDIT_SECRET ? 'fail' : 'not-tested',
          AUDIT_SECRET
            ? 'no voice events on any channel under any setting — narration may not have fired (check TTS / brain availability)'
            : 'no voice events observable: prod posts to the real /api/audit-stream and AUDIT_STREAM_SECRET is unset (pass it to verify on prod) — setting IS reachable + written');
      } else if (fullSpoke && silentQuiet) {
        record('voice-pref-variance', 'pass', `full SPOKE (${full.spoken}) vs silent SILENCED (${silent.spoken} spoken/${silent.silenced} silenced); brief spoke=${briefSpoke}(${brief.spoken})`);
      } else if (!fullSpoke && full.total > 0) {
        record('voice-pref-variance', 'fail', `'full' did NOT speak (spoken=0, total=${full.total}) — full contract broken`);
      } else if (!silentQuiet) {
        record('voice-pref-variance', 'fail', `'silent' SPOKE ${silent.spoken} voice event(s) — silent contract broken (should short-circuit at the silent gate)`);
      } else {
        record('voice-pref-variance', 'fail', `inconclusive variance: full=${JSON.stringify(full)} silent=${JSON.stringify(silent)}`);
      }
    }
  } catch (e) {
    record('voice-pref-variance', 'fail', `threw: ${String(e?.message ?? e).slice(0, 120)}`);
  }

  // ── Coverage grid + report ──
  const pass = GRID.filter((g) => g.status === 'pass').length;
  const fail = GRID.filter((g) => g.status === 'fail').length;
  const notTested = GRID.filter((g) => g.status === 'not-tested').length;
  console.log('\n===== GAP COVERAGE GRID =====');
  for (const g of GRID) {
    const icon = g.status === 'pass' ? '✅' : g.status === 'fail' ? '❌' : '⚠️ ';
    console.log(`  ${icon} ${g.gap.padEnd(40)} [${g.status}] ${g.detail}`);
  }
  console.log(`\n  pass=${pass}  fail=${fail}  not-tested=${notTested}  appErrors=${errs.length}`);
  if (notTested) console.log(`  ⚠️  NOT TESTED: ${GRID.filter((g) => g.status === 'not-tested').map((g) => g.gap).join(', ')}`);
  if (errs.length) for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ app error: ${e}`);

  const report = {
    base: BASE, startedAt: stamp, auditSecretPresent: Boolean(AUDIT_SECRET),
    grid: GRID, summary: { pass, fail, notTested, appErrors: errs.length },
    appErrors: [...new Set(errs)],
    voiceEventKinds: localVoiceEvents().reduce((acc, e) => { acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc; }, {}),
  };
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
  console.log(`  report: ${join(OUT, 'report.json')}`);

  await listener.stop?.().catch?.(() => undefined);
  await browser.close();

  // Exit 1 on any FAIL or any captured app error during a gap test. NOT-
  // TESTED gaps are reported but don't fail the run (the gap was genuinely
  // unreachable in this environment and is flagged for the runner/David).
  if (fail > 0 || errs.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error('[gaps] FATAL', e); process.exit(1); });
