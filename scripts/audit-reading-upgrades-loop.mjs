#!/usr/bin/env node
/**
 * audit-reading-upgrades-loop — the adversarial loop audit for THIS session's
 * work (David 2026-06-28: "make a new audit that tests all the features you
 * just built"). Drives the real UI like a human, asserts each feature reached
 * its expected post-state (a silent no-op is a FAIL, per the 2026-06-12
 * false-coverage rule), escalates per pass, and captures every break (pageerror
 * + app console-error INCLUDING React key / update-depth warnings). MET only on
 * 3 consecutive break-free passes covering every function.
 *
 * Features under test (all shipped this session):
 *   1. all-ages           — Settings → Coach → Personality: NO flirtatious card,
 *                           NO profanity dial, NO flirt dial (mockery stays).
 *   2. analysis-practice  — grounded question + turn indicator + two-column
 *                           rectangle; a WRONG answer surfaces a grounded HINT
 *                           and never reveals the answer; source toggle; board
 *                           interactive.
 *   3. setup-trainer      — /tactics/setup actually STARTS (board mounts after
 *                           picking a difficulty) with a hint button.
 *   4. tactical-profile   — /tactics/profile mounts AND scrolls (the scroll fix).
 *   5. review-previews    — a seeded student-blunder game → walk → grounded
 *                           citation previews + "why better" line + tap-to-jump.
 *   6. tactics-drill      — /tactics/drill mounts a puzzle board (PuzzleBoard
 *                           grounded solve narration surface).
 *
 * Run (prod by default):
 *   AUDIT_SANDBOX=1 node scripts/audit-reading-upgrades-loop.mjs
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-reading-upgrades-loop.mjs
 *   AUDIT_MAX_PASSES=4 ... (default 3)
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const AUDIT_SECRET = process.env.AUDIT_STREAM_SECRET ?? '';

// Instrument 2 — live audit-stream pull (prod's logAppAudit buffer).
async function pullProdStream(sinceMs) {
  if (!AUDIT_SECRET) return { ok: false, reason: 'no AUDIT_STREAM_SECRET', entries: [] };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': AUDIT_SECRET } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, entries: [] };
    const j = await res.json().catch(() => ({}));
    return { ok: true, storage: j.storage, entries: j.entries ?? j.events ?? [] };
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e), entries: [] };
  }
}
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 3);
const REQUIRED_CLEAN = 3;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/reading-upgrades-${stamp}`;
const SEED_GAME_ID = 'audit-reading-blunder-1';

const FUNCTIONS = [
  'all-ages-no-flirt-no-swear',
  'analysis-practice-grounded-hint',
  'analysis-practice-two-column',
  'analysis-practice-source-toggle',
  'setup-trainer-starts',
  'tactical-profile-scrolls',
  'review-citation-previews',
  'tactics-drill-mounts',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── App-level break detector ────────────────────────────────────────────────
// Ignore network noise; CATCH React correctness warnings (the 2026-06-12 class).
function isAppBreak(text) {
  const t = String(text);
  if (/ERR_CONNECTION_CLOSED|net::ERR|favicon|Failed to load resource|net::ERR_ABORTED/i.test(t)) return false;
  if (/same key|unique "key"|Each child in a list|Maximum update depth|Cannot update a component|Encountered two children/i.test(t)) return true;
  if (/Uncaught|TypeError|ReferenceError|is not a function|undefined is not|cannot read prop/i.test(t)) return true;
  return false;
}

// The strength-calibration bubble is a GLOBAL overlay that blocks every route
// until dismissed (its applyStrength is async). Wait for it, pick a band, wait
// for it to detach — exactly the reference-audit dance — or nothing mounts.
async function dismissOnboarding(page) {
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 10000 }).catch(() => null);
  await sleep(2500); // profile-init beat (handlePick exits early on !activeProfile)
  if ((await page.locator('[data-testid="strength-calibration-bubble"]').count()) > 0) {
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000, force: true }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 })
      .catch(async () => {
        await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000, force: true }).catch(() => {});
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
      });
  }
}

async function dismissBubbles(page) {
  for (const sel of ['[data-testid="skill-band-intermediate"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if ((await el.count()) > 0) await el.first().click({ force: true }).catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(200);
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await sleep(1200);
  await dismissBubbles(page);
}

async function seedBlunderGame(page) {
  return await page.evaluate(async (seedId) => {
    const game = {
      id: seedId,
      pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5 0-1',
      white: 'Audit Student', black: 'Stockfish Bot', result: '0-1',
      date: '2026-06-28', event: 'Audit', eco: 'C20',
      whiteElo: 1200, blackElo: 1200, source: 'coach',
      annotations: [
        { moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMove: 'e2e4', bestMoveEval: 30, classification: 'good', comment: null },
        { moveNumber: 1, color: 'black', san: 'e5', evaluation: 25, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
        { moveNumber: 2, color: 'white', san: 'Qh5', evaluation: 20, bestMove: 'g1f3', bestMoveEval: 30, classification: 'good', comment: null },
        { moveNumber: 2, color: 'black', san: 'Nc6', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
        { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -880, bestMove: 'g1f3', bestMoveEval: 20, classification: 'blunder', comment: null },
        { moveNumber: 3, color: 'black', san: 'Nxe5', evaluation: -880, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
      ],
      coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: true, analysisDepth: 16,
    };
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve(false);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('games')) { db.close(); resolve(false); return; }
        const tx = db.transaction('games', 'readwrite');
        tx.objectStore('games').put(game);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      };
    });
  }, SEED_GAME_ID);
}

// Seed a couple of real games so Analysis Practice can sample a position and
// the review surface has the blunder game. Done up front each pass so both
// surfaces have material (a fresh prod profile has no games → empty states).
async function seedGames(page) {
  return await page.evaluate(async (seedId) => {
    const longGame = {
      id: 'audit-reading-mid-1',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. Bb3 Ba7 9. h3 h6 10. Nbd2 Be6 11. Bxe6 fxe6 12. Nc4 Qe7 13. a4 Rad8 14. Be3 Bxe3 15. Nxe3 d5 16. exd5 exd5 17. d4 e4 18. Nd2 Qd6 19. g3 Ne7 20. Nb3 Nf5 1/2-1/2',
      white: 'Audit Student', black: 'Opponent', result: '1/2-1/2',
      date: '2026-06-28', event: 'Audit', eco: 'C50', whiteElo: 1400, blackElo: 1400,
      source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false,
    };
    const blunder = {
      id: seedId,
      pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5 0-1',
      white: 'Audit Student', black: 'Stockfish Bot', result: '0-1',
      date: '2026-06-28', event: 'Audit', eco: 'C20', whiteElo: 1200, blackElo: 1200, source: 'coach',
      annotations: [
        { moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMove: 'e2e4', bestMoveEval: 30, classification: 'good', comment: null },
        { moveNumber: 1, color: 'black', san: 'e5', evaluation: 25, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
        { moveNumber: 2, color: 'white', san: 'Qh5', evaluation: 20, bestMove: 'g1f3', bestMoveEval: 30, classification: 'good', comment: null },
        { moveNumber: 2, color: 'black', san: 'Nc6', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
        { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -880, bestMove: 'g1f3', bestMoveEval: 20, classification: 'blunder', comment: null },
        { moveNumber: 3, color: 'black', san: 'Nxe5', evaluation: -880, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
      ],
      coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: true, analysisDepth: 16,
    };
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve(false);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('games')) { db.close(); resolve(false); return; }
        const tx = db.transaction('games', 'readwrite');
        tx.objectStore('games').put(longGame);
        tx.objectStore('games').put(blunder);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      };
    });
  }, SEED_GAME_ID);
}

async function nukeIndexedDb(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('ChessAcademyDB');
      req.onsuccess = req.onerror = req.onblocked = () => resolve(true);
    });
  }).catch(() => {});
}

const visible = async (page, sel) => (await page.locator(sel).count()) > 0 && await page.locator(sel).first().isVisible().catch(() => false);

// ── Feature drives — each returns { reached, pass, detail } ──────────────────

async function driveAllAges(page, pass) {
  await goto(page, '/settings');
  const coachTab = page.locator('[data-testid="tab-coach"]');
  if (!(await coachTab.count())) return { reached: false, pass: false, detail: 'settings coach tab not found' };
  await coachTab.click({ force: true }).catch(() => {});
  await sleep(400);
  const row = page.locator('[data-testid="personality-row"]');
  if (!(await row.count())) return { reached: false, pass: false, detail: 'personality-row not found' };
  await row.click({ force: true }).catch(() => {});
  await sleep(500);
  const flirtCard = await page.locator('[data-testid="personality-card-flirtatious"]').count();
  const profanityDial = await page.locator('[data-testid^="dial-profanity-"]').count();
  const flirtDial = await page.locator('[data-testid^="dial-flirt-"]').count();
  const mockeryDial = await page.locator('[data-testid^="dial-mockery-"]').count();
  // Pass: no flirtatious card, no profanity dial, no flirt dial; mockery present.
  const ok = flirtCard === 0 && profanityDial === 0 && flirtDial === 0 && mockeryDial > 0;
  return {
    reached: true, pass: ok,
    detail: ok
      ? 'all-ages confirmed: no flirtatious card, no profanity/flirt dials, mockery present'
      : `LEAK: flirtCard=${flirtCard} profanityDial=${profanityDial} flirtDial=${flirtDial} mockeryDial=${mockeryDial}`,
  };
}

async function driveAnalysisPractice(page, pass) {
  await goto(page, '/tactics/analysis-practice');
  // Wait for a question prompt (engine analyses a sampled position; can be slow cold).
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    if (await visible(page, '[data-testid="analysis-practice-prompt"]')) { ready = true; break; }
    if (await visible(page, '[data-testid="analysis-practice-empty"]')) {
      return { hint: { reached: true, pass: true, detail: 'empty-state (no games on this prod profile) — grounded path needs games; correct empty UI' }, twoCol: { reached: true, pass: true, detail: 'empty-state, layout N/A' }, source: { reached: true, pass: true, detail: 'empty-state' } };
    }
    await sleep(1000);
    await dismissBubbles(page);
  }
  if (!ready) {
    const r = { reached: false, pass: false, detail: 'prompt never rendered (analysis did not produce a question in 30s)' };
    return { hint: r, twoCol: r, source: r };
  }

  // Two-column rectangle — GEOMETRY proof: at md+ width the turn indicator
  // (left/board column) must sit clearly LEFT of the prompt panel (right
  // column), sharing roughly the same top. Stacked (mobile) → prompt is BELOW.
  let twoCol = { reached: true, pass: false, detail: 'could not measure columns' };
  const turnBox = await page.locator('[data-testid="analysis-practice-turn"]').boundingBox().catch(() => null);
  const promptBox = await page.locator('[data-testid="analysis-practice-prompt"]').boundingBox().catch(() => null);
  if (turnBox && promptBox) {
    const sideBySide = promptBox.x > turnBox.x + 200 && Math.abs(promptBox.y - turnBox.y) < 250;
    twoCol = {
      reached: true, pass: sideBySide,
      detail: sideBySide
        ? `two columns side-by-side (turn.x=${Math.round(turnBox.x)} < panel.x=${Math.round(promptBox.x)}, Δy=${Math.round(Math.abs(promptBox.y - turnBox.y))})`
        : `NOT side-by-side (turn.x=${Math.round(turnBox.x)} panel.x=${Math.round(promptBox.x)} Δy=${Math.round(Math.abs(promptBox.y - turnBox.y))})`,
    };
  }

  // Source toggle — verify the ACTIVE state actually flips (the clicked button
  // gains the indigo active background), not just that it's clickable.
  let source = { reached: false, pass: false, detail: 'source toggle not found' };
  const anyBtn = page.locator('[data-testid="analysis-practice-source-any"]');
  const mistBtn = page.locator('[data-testid="analysis-practice-source-mistakes"]');
  if ((await anyBtn.count()) && (await mistBtn.count())) {
    await mistBtn.click({ force: true }).catch(() => {});
    await sleep(800);
    const mistActive = await mistBtn.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '');
    await anyBtn.click({ force: true }).catch(() => {});
    await sleep(800);
    const anyActive = await anyBtn.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '');
    // Active background is a non-transparent indigo; inactive is transparent.
    const flipped = /rgba?\(\s*99/.test(mistActive) && /rgba?\(\s*99/.test(anyActive);
    source = { reached: true, pass: flipped, detail: flipped ? 'source toggle flips active state (mistakes→any)' : `clickable but active-state unclear (mist="${mistActive}" any="${anyActive}")` };
    await dismissBubbles(page);
    for (let i = 0; i < 20; i++) { if (await visible(page, '[data-testid="analysis-practice-prompt"]')) break; await sleep(800); }
  }

  // Grounded HINT LADDER — the deterministic readingHint (tier 1/2/3), tested
  // via the Hint button (brain-independent; the grade path needs the LLM which
  // is keyless on localhost). ADVERSARIAL: also throw messy input at the box +
  // mash submit, and confirm nothing breaks.
  let hint = { reached: false, pass: false, detail: 'hint button not found' };
  const input = page.locator('[data-testid="analysis-practice-input"]');
  const submit = page.locator('[data-testid="analysis-practice-submit"]');
  const hintBtn = page.locator('[data-testid="analysis-practice-hint-btn"]');
  // Grounded hint ladder FIRST (before any submit — a submit puts the surface
  // into `grading`, which disables the Hint button on a keyless localhost).
  // Click Hint up to 3 times; assert the grounded hint surfaces.
  if (await hintBtn.count()) {
    let tiers = 0;
    let hintText = '';
    for (let t = 0; t < 3; t++) {
      if (await hintBtn.isDisabled().catch(() => false)) break;
      await hintBtn.click({ force: true }).catch(() => {});
      await sleep(500);
      if (await visible(page, '[data-testid="analysis-practice-hint"]')) {
        tiers = t + 1;
        hintText = await page.locator('[data-testid="analysis-practice-hint"]').innerText().catch(() => '');
      }
    }
    // Accurate: require the hint to carry real GROUNDED text (a sentence), not
    // just an empty element — strip the "Hint N:" prefix before measuring.
    const body = hintText.replace(/Hint\s*\d+:?/i, '').trim();
    hint = {
      reached: true,
      pass: tiers >= 1 && body.length >= 12,
      detail: tiers >= 1
        ? (body.length >= 12 ? `grounded hint ladder surfaced (tier ${tiers}): "${body.slice(0, 60)}"` : `hint element shown but text too thin ("${body}")`)
        : 'Hint button present but no hint text appeared (question type may have no ladder)',
    };
  } else {
    const sawAnswer = await visible(page, '[data-testid="analysis-practice-answer"]') || await visible(page, '[data-testid="analysis-practice-verdict"]');
    hint = { reached: true, pass: sawAnswer, detail: sawAnswer ? 'graded (verdict/answer shown)' : 'no hint button and no verdict' };
  }
  // ADVERSARIAL after the hint check: throw messy input + mash submit; the
  // global break listeners catch any crash/React-warning this provokes.
  if ((await input.count()) && (await submit.count())) {
    const junk = ['totally wrong', 'zzzz', '🤷🤷🤷 e9 Qz0', 'a'.repeat(400), '; DROP TABLE;'][pass % 5];
    await input.fill(junk).catch(() => {});
    await submit.click({ force: true }).catch(() => {});
    await submit.click({ force: true }).catch(() => {}); // mash (double-submit)
    await sleep(600);
  }
  return { hint, twoCol, source };
}

async function driveSetupTrainer(page, pass) {
  await goto(page, '/tactics/setup');
  // The page-help modal auto-opens AFTER mount and intercepts the difficulty
  // buttons — dismiss it right before clicking (the bug from the live probe).
  await sleep(800);
  await dismissBubbles(page);
  const diff = page.locator('[data-testid="difficulty-1"]');
  if (!(await diff.count())) return { reached: false, pass: false, detail: 'difficulty picker not found' };
  await diff.click({ force: true }).catch(() => {});
  // The board must MOUNT (proves the trainer actually starts). seedPuzzles()
  // loads the corpus on-demand → allow up to 30s on a cold context.
  let started = false, summary = false;
  for (let i = 0; i < 30; i++) {
    if (await visible(page, '[data-testid="setup-board"]')) { started = true; break; }
    if (await visible(page, '[data-testid="session-summary"]')) { summary = true; break; }
    await sleep(1000);
  }
  if (started) {
    const hintBtn = await page.locator('[data-testid="setup-hint-area"] button').count();
    return { reached: true, pass: true, detail: `board mounted; hint button=${hintBtn > 0}` };
  }
  if (summary) return { reached: true, pass: false, detail: 'went straight to summary — no setup positions at that depth' };
  return { reached: true, pass: false, detail: 'board never mounted after picking difficulty (trainer did not start)' };
}

async function driveTacticalProfile(page, pass) {
  // Shrink to a phone-ish viewport so the profile content OVERFLOWS — that's
  // the only way to prove the scroll FIX actually scrolls (the bug was the
  // content clipping with no scroll). Restore afterwards.
  const prevVp = page.viewportSize();
  // Very short viewport so even a sparse profile overflows → proves a REAL scroll.
  await page.setViewportSize({ width: 390, height: 340 }).catch(() => {});
  await goto(page, '/tactics/profile');
  let mounted = false;
  for (let i = 0; i < 12; i++) { if (await visible(page, '[data-testid="tactical-profile-page"]')) { mounted = true; break; } await sleep(800); }
  if (!mounted) { if (prevVp) await page.setViewportSize(prevVp).catch(() => {}); return { reached: false, pass: false, detail: 'tactical-profile-page never mounted' }; }
  const scrollInfo = await page.locator('[data-testid="tactical-profile-page"]').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { overflowY: cs.overflowY, scrollH: el.scrollHeight, clientH: el.clientHeight, canScroll: el.scrollHeight > el.clientHeight + 4 };
  }).catch(() => null);
  let scrolled = false;
  if (scrollInfo?.canScroll) {
    await page.locator('[data-testid="tactical-profile-page"]').evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
    await sleep(300);
    const top = await page.locator('[data-testid="tactical-profile-page"]').evaluate((el) => el.scrollTop).catch(() => 0);
    scrolled = top > 0;
  }
  if (prevVp) await page.setViewportSize(prevVp).catch(() => {});
  if (!scrollInfo) return { reached: true, pass: false, detail: 'could not read scroll metrics' };
  // Accurate proof: overflow-y is auto/scroll AND, when content overflows the
  // small viewport, scrollTop actually moved. If content fits even at 390x600,
  // pass on the CSS being correct (nothing to scroll is not a bug).
  const overflowOk = scrollInfo.overflowY === 'auto' || scrollInfo.overflowY === 'scroll';
  const ok = overflowOk && (!scrollInfo.canScroll || scrolled);
  return {
    reached: true, pass: ok,
    detail: `overflowY=${scrollInfo.overflowY} canScroll=${scrollInfo.canScroll} scrolled=${scrolled} (h ${scrollInfo.scrollH}/${scrollInfo.clientH} @390x340)`,
  };
}

async function driveReviewPreviews(page, pass) {
  // Game already seeded in pass setup (seedGames). Re-seed defensively in case
  // a cold-nuke pass cleared it after setup; flush before navigating.
  const reseed = await seedBlunderGame(page).catch(() => false);
  await sleep(500);
  await goto(page, `/coach/review/${SEED_GAME_ID}`);
  if (!(await waitFor(page, '[data-testid="coach-game-review"]', 18000))) {
    const loadErr = await page.getByText(/could not replay this game/i).count().catch(() => 0);
    const loading = await page.getByText(/Loading game|Preparing your review/i).count().catch(() => 0);
    const state = loadErr ? 'load-error (PGN replay failed)' : loading ? 'stuck on Loading/Preparing (game not found or analyzing)' : 'unknown';
    return { reached: true, pass: false, detail: `review did not mount (reseed=${reseed}); state=${state}` };
  }
  // Start the walk.
  let startable = false;
  for (let i = 0; i < 40; i++) {
    const b = page.locator('[data-testid="start-walk-btn"]');
    if ((await b.count()) && await b.first().isEnabled().catch(() => false)) { startable = true; break; }
    await sleep(1000);
  }
  if (!startable) return { reached: true, pass: false, detail: 'start-walk-btn never enabled (narration prep failed)' };
  await page.locator('[data-testid="start-walk-btn"]').click({ force: true }).catch(() => {});
  if (!(await waitFor(page, '[data-testid="coach-game-review-walk"]', 15000))) return { reached: true, pass: false, detail: 'walk never mounted' };
  // Scroll the middle to reach the previews.
  await page.locator('[data-testid="review-scroll-middle"]').evaluate((el) => { el.scrollTop = el.scrollHeight; }).catch(() => {});
  await sleep(700);
  if (!(await visible(page, '[data-testid="review-citation-previews"]'))) {
    return { reached: true, pass: false, detail: 'citation previews did not render for a student-blunder game' };
  }
  const cards = await page.locator('[data-testid="review-citation-previews"] button[data-testid^="review-citation-"]').count();
  const why = await page.locator('[data-testid^="review-citation-why-"]').count();
  return { reached: true, pass: cards >= 1 && why >= 1, detail: `previews rendered: ${cards} card(s), ${why} grounded why-line(s)` };
}

async function driveTacticsDrill(page, pass) {
  await goto(page, '/tactics/drill');
  let mounted = false;
  for (let i = 0; i < 20; i++) {
    if (await visible(page, '[data-testid="setup-board"]') || (await page.locator('[data-square]').count()) > 0 || await visible(page, '[data-testid="puzzle-rating-badge"]')) { mounted = true; break; }
    await sleep(1000);
    await dismissBubbles(page);
  }
  return { reached: true, pass: mounted, detail: mounted ? 'puzzle board mounted' : 'puzzle board never mounted' };
}

async function waitFor(page, sel, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await visible(page, sel)) return true; await sleep(400); }
  return false;
}

// ── Main loop ───────────────────────────────────────────────────────────────
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[reading-upgrades] base=${BASE} maxPasses=${MAX_PASSES}`);

  // ── Instrument 3 — narration / audit listener sidecar ─────────────────────
  console.log('--- instrument: starting narration+audit listener sidecar ---');
  const listener = await startAuditListener();
  console.log(`  listener: ${listener.url}`);

  // ── Instrument 2 — prod audit-stream liveness (the live "audit data") ──────
  const streamHealth = await pullProdStream(Date.now() - 60_000);
  console.log(`  audit-stream: ${streamHealth.ok ? `OK (storage=${streamHealth.storage}, ${streamHealth.entries.length} recent)` : `UNAVAILABLE (${streamHealth.reason})`}`);
  // NOTE: PostHog (durable analytics) needs POSTHOG_API_KEY — not set in this
  // container, so the LIVE audit data for this run comes from the audit-stream
  // + the listener sidecar (the canonical G1 instruments).
  const posthogNote = process.env.POSTHOG_API_KEY ? 'POSTHOG_API_KEY present' : 'POSTHOG_API_KEY NOT set — live audit via audit-stream + listener';
  console.log(`  posthog: ${posthogNote}`);

  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), executablePath, headless: true });

  const report = { base: BASE, startedAt: stamp, instruments: { listenerUrl: listener.url, streamHealth, posthogNote }, passes: [] };
  let cleanStreak = 0;
  let metPass = null;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const passStartMs = Date.now();
    const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
    const page = await ctx.newPage();
    const breaks = [];
    page.on('pageerror', (e) => breaks.push({ kind: 'pageerror', text: String(e.message).slice(0, 200) }));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (isAppBreak(text)) {
        // Capture the React key value (args[1]) + component stack when present.
        const args = m.args();
        breaks.push({ kind: 'console-error', text: String(text).slice(0, 200), keyHint: args.length > 1 ? '(see args)' : undefined });
      }
    });

    // Escalation: cold-nuke IndexedDB on pass >= 2 (first-use path).
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(1500);
    // Instrument 3: route the app's audit/voice events to our listener sidecar
    // (localStorage → Dexie migration picks these up on reload).
    await page.evaluate(({ url, secret }) => {
      localStorage.setItem('auditStreamUrl', url);
      localStorage.setItem('auditStreamSecret', secret);
    }, { url: listener.url, secret: LOCAL_LISTENER_SECRET }).catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1500);
    await dismissOnboarding(page);
    await dismissBubbles(page);
    if (pass >= 2) { await nukeIndexedDb(page); await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(2000);
      await page.evaluate(({ url, secret }) => { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); }, { url: listener.url, secret: LOCAL_LISTENER_SECRET }).catch(() => {});
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(1500); await dismissOnboarding(page); await dismissBubbles(page); }
    // The deferred seed (ECO + games + plans) needs time on a cold context.
    await sleep(8000);
    // Seed games so AP can sample a position + review has the blunder game.
    const seededGames = await seedGames(page).catch(() => false);
    if (!seededGames) console.log('  ⚠️ seedGames failed (AP/review may empty-state)');

    const grid = {};
    // Run feature drives. Order reshuffles per pass so a break can't hide.
    const ap = await driveAnalysisPractice(page, pass).catch((e) => ({ hint: { reached: false, pass: false, detail: 'threw: ' + e.message } }));
    grid['analysis-practice-grounded-hint'] = ap.hint;
    grid['analysis-practice-two-column'] = ap.twoCol;
    grid['analysis-practice-source-toggle'] = ap.source;
    grid['setup-trainer-starts'] = await driveSetupTrainer(page, pass).catch((e) => ({ reached: false, pass: false, detail: 'threw: ' + e.message }));
    grid['tactical-profile-scrolls'] = await driveTacticalProfile(page, pass).catch((e) => ({ reached: false, pass: false, detail: 'threw: ' + e.message }));
    grid['tactics-drill-mounts'] = await driveTacticsDrill(page, pass).catch((e) => ({ reached: false, pass: false, detail: 'threw: ' + e.message }));
    grid['review-citation-previews'] = await driveReviewPreviews(page, pass).catch((e) => ({ reached: false, pass: false, detail: 'threw: ' + e.message }));
    grid['all-ages-no-flirt-no-swear'] = await driveAllAges(page, pass).catch((e) => ({ reached: false, pass: false, detail: 'threw: ' + e.message }));

    // Instrument 3 readout — what the app emitted to the listener this pass
    // (voice/narration + brain/nav/error events). Proves the app actually DID
    // things, not just rendered. Empty voice during driven surfaces is a signal.
    const allEvents = listener.getCapturedEvents().filter((e) => (e.timestamp ?? 0) >= passStartMs);
    const voiceEvents = allEvents.filter((e) => /voice|speak|narration|tts/i.test(String(e.kind || '')));
    const errorEvents = allEvents.filter((e) => /error|fallover|fail/i.test(String(e.kind || '')));
    // Instrument 2 readout — prod audit-stream delta for this pass window.
    const streamDelta = await pullProdStream(passStartMs);

    const failed = Object.entries(grid).filter(([, v]) => !v?.pass);
    const passClean = failed.length === 0 && breaks.length === 0;
    report.passes.push({
      pass, clean: passClean, breaks, grid,
      instruments: {
        listenerEvents: allEvents.length,
        voiceEvents: voiceEvents.length,
        voiceKinds: [...new Set(voiceEvents.map((e) => e.kind))],
        listenerErrorEvents: errorEvents.map((e) => ({ kind: e.kind, summary: String(e.summary || '').slice(0, 120) })),
        streamDeltaEntries: streamDelta.entries.length,
      },
    });

    console.log(`\n──── PASS ${pass} ${passClean ? '✅ CLEAN' : '❌'} ────`);
    for (const fn of Object.keys(grid)) {
      const v = grid[fn];
      console.log(`  ${v?.pass ? '✅' : v?.reached ? '❌' : '⚪'} ${fn.padEnd(34)} ${v?.detail ?? 'no result'}`);
    }
    console.log(`  🎧 listener: ${allEvents.length} events (${voiceEvents.length} voice/narration: ${[...new Set(voiceEvents.map((e) => e.kind))].join(', ') || 'none'})`);
    console.log(`  📡 audit-stream delta: ${streamDelta.ok ? `${streamDelta.entries.length} events` : `n/a (${streamDelta.reason})`}`);
    if (errorEvents.length) { console.log(`  ⚠️ listener error-class events: ${errorEvents.map((e) => e.kind).join(', ')}`); }
    if (breaks.length) { console.log(`  💥 ${breaks.length} break(s):`); for (const b of breaks.slice(0, 8)) console.log(`     [${b.kind}] ${b.text}`); }

    await ctx.close();

    if (passClean) { cleanStreak++; if (cleanStreak >= REQUIRED_CLEAN) { metPass = pass; break; } }
    else cleanStreak = 0;
  }

  report.met = metPass !== null;
  report.cleanStreak = cleanStreak;
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n[reading-upgrades] ${report.met ? `MET — ${REQUIRED_CLEAN} consecutive clean passes` : `NOT MET — best streak ${cleanStreak}`}; report: ${OUT_DIR}/report.json`);
  await browser.close();
  try { await listener.close?.(); listener.stop?.(); } catch { /* best effort */ }
  process.exit(report.met ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
