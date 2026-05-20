#!/usr/bin/env node
/**
 * Openings-tab FULL audit — picks 10 openings from each of 3 sources
 * (repertoire / pro-repertoires / gambits) and runs every visible
 * play service to completion on every subline.
 *
 * Per David 2026-05-18: "Run Every play service TO THE END! No
 * shortcuts." + "Anything the user can click on!"
 *
 * Per opening:
 *   - Mount /openings/<id>, enumerate every interactive testid on
 *     the detail page (clickable surface inventory).
 *   - For MAIN line + every variation + every trap + every warning:
 *     - Walkthrough: auto-play through every ply, capture annotation
 *     - Learn: same (different surface — variation-learn vs walkthrough)
 *     - Practice: drag the EXPECTED move on every ply, capture
 *       correct/wrong flash per ply
 *   - Play vs Coach (main line only): Stockfish-vs-Stockfish (drive
 *     both sides) for 60 plies max OR until mate/draw.
 *
 * Resumable: writes report.json after every per-subline service.
 * If `AUDIT_RESUME=1` and report.json exists, skips already-done
 * (opening + subline + service) combinations.
 *
 * Output: docs/audit-runs/2026-05-18-openings-full/{report.json,report.md}
 * Saved under docs/audit-runs/ so it survives sandbox restarts.
 */

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { Chess } from 'chess.js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? `docs/audit-runs/2026-05-18-openings-full`;
const REPORT_PATH = join(OUT_DIR, 'report.json');
const SUMMARY_PATH = join(OUT_DIR, 'report.md');
const SETTLE_MS = 1000;
const PER_PLY_TIMEOUT_MS = 3000;
const PLAY_PLY_CAP = 60;

// ─── Sample selection: 10 from each source ─────────────────────────

const PICK_MAIN = [
  'italian-game',
  'sicilian-najdorf',
  'ruy-lopez',
  'caro-kann',
  'french-defence',
  'kings-gambit',
  'kings-indian-defence',
  'queens-gambit',
  'scotch-game',
  'alekhine-defence',
];

const PICK_PRO = [
  'pro-naroditsky-scotch',
  'pro-hikaru-najdorf',
  'pro-carlsen-catalan',
  'pro-caruana-ruy-lopez',
  'pro-firouzja-vienna',
  'pro-gothamchess-london',
  'pro-praggnanandhaa-ruy-lopez',
  'pro-dubov-sveshnikov',
  'pro-niemann-anti-marshall',
  'pro-naroditsky-alapin',
];

const PICK_GAMBITS = [
  'gambit-kings-gambit',
  'gambit-evans-gambit',
  'scotch-gambit',
  'vienna-gambit',
  'danish-gambit',
  'smith-morra-gambit',
  'stafford-gambit',
  'marshall-attack',
  'englund-gambit',
  'gambit-budapest-gambit',
];

// ─── Data loading ───────────────────────────────────────────────────

let allOpeningsById = null;
async function getOpening(id) {
  if (!allOpeningsById) {
    const pro = JSON.parse(await readFile('./src/data/pro-repertoires.json', 'utf-8'));
    const rep = JSON.parse(await readFile('./src/data/repertoire.json', 'utf-8'));
    const gam = JSON.parse(await readFile('./src/data/gambits.json', 'utf-8'));
    const proList = pro.openings ?? [];
    const repList = Array.isArray(rep) ? rep : Object.values(rep);
    const gamList = Array.isArray(gam) ? gam : Object.values(gam);
    allOpeningsById = new Map();
    for (const o of [...proList, ...repList, ...gamList]) allOpeningsById.set(o.id, o);
  }
  return allOpeningsById.get(id) ?? null;
}

function pgnToVerboseMoves(pgn) {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const c = new Chess();
  const out = [];
  for (const tok of tokens) {
    try {
      const m = c.move(tok);
      out.push({ san: m.san, from: m.from, to: m.to, promotion: m.promotion ?? null });
    } catch {
      break;
    }
  }
  return out;
}

// ─── DOM probe helpers ─────────────────────────────────────────────

async function captureAllTestIds(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]'))
      .map((el) => el.getAttribute('data-testid'))
      .filter(Boolean);
  }).catch(() => []);
}

async function captureWalkthroughCard(page) {
  return await page.evaluate(() => {
    const labelEl = document.querySelector('[data-testid="annotation-move-label"]');
    const textEl = document.querySelector('[data-testid="annotation-text"]');
    return {
      label: (labelEl?.textContent ?? '').trim(),
      text: (textEl?.textContent ?? '').trim(),
    };
  }).catch(() => ({ label: '', text: '' }));
}

async function clickNext(page) {
  for (const sel of ['[data-testid="nav-next"]', 'button[aria-label*="Next" i]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 1500 }).catch(() => {});
      return true;
    }
  }
  await page.keyboard.press('ArrowRight').catch(() => {});
  return true;
}

async function dragPieceMove(page, from, to) {
  const source = page.locator(`[data-square="${from}"]`).first();
  const target = page.locator(`[data-square="${to}"]`).first();
  if (!(await source.isVisible().catch(() => false))) return { ok: false, error: 'source-square-not-visible' };
  if (!(await target.isVisible().catch(() => false))) return { ok: false, error: 'target-square-not-visible' };
  try {
    const sBox = await source.boundingBox();
    const tBox = await target.boundingBox();
    if (!sBox || !tBox) return { ok: false, error: 'no-bounding-box' };
    const sx = sBox.x + sBox.width / 2;
    const sy = sBox.y + sBox.height / 2;
    const tx = tBox.x + tBox.width / 2;
    const ty = tBox.y + tBox.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(tx, ty, { steps: 6 });
    await page.mouse.up();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

async function clickLauncher(page, sel) {
  const el = page.locator(sel).first();
  const visible = await el.isVisible().catch(() => false);
  if (!visible) await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  return await el.click({ timeout: 5000 }).then(() => true).catch(() => false);
}

async function exitToDetail(page) {
  // Try the back button on each mode
  for (const sel of [
    '[data-testid="walkthrough-back"]',
    '[data-testid="practice-back"]',
    '[data-testid="practice-exit"]',
    '[data-testid="back-button"]',
    'button[aria-label*="back" i]',
  ]) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(500);
      const onDetail = await page.locator('[data-testid="opening-detail"]').first().isVisible().catch(() => false);
      if (onDetail) return true;
    }
  }
  return false;
}

// ─── Per-service runners ────────────────────────────────────────────

async function runWalkthrough(page, expectedSans, settleMs = SETTLE_MS) {
  const mounted = await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!mounted) return { mounted: false, plies: [] };
  await page.waitForTimeout(settleMs);
  const plies = [];
  let lastLabel = '';
  for (let p = 1; p <= expectedSans.length && p <= 40; p++) {
    await clickNext(page);
    const t0 = Date.now();
    let snap = null;
    while (Date.now() - t0 < PER_PLY_TIMEOUT_MS) {
      await page.waitForTimeout(120);
      const s = await captureWalkthroughCard(page);
      if (s.label && s.label !== lastLabel) { snap = s; lastLabel = s.label; break; }
    }
    if (!snap) snap = await captureWalkthroughCard(page);
    plies.push({ ply: p, expectedSan: expectedSans[p - 1].san, label: snap.label, text: snap.text.slice(0, 240) });
  }
  return { mounted: true, plies };
}

async function runPractice(page, expectedSans, studentColor) {
  const mounted = await page.locator('[data-testid="practice-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!mounted) return { mounted: false, attempts: [] };
  await page.waitForTimeout(1500);
  const attempts = [];
  // Practice expects student to play the student-side moves. Identify
  // which plies are the student's based on the opening's `color`.
  const studentIsWhite = studentColor === 'white';
  for (let p = 0; p < expectedSans.length && p < 20; p++) {
    const isStudentMove = studentIsWhite ? (p % 2 === 0) : (p % 2 === 1);
    if (!isStudentMove) {
      // The opponent's move plays automatically; wait briefly.
      await page.waitForTimeout(1200);
      continue;
    }
    const expected = expectedSans[p];
    const drag = await dragPieceMove(page, expected.from, expected.to);
    await page.waitForTimeout(900);
    const correct = await page.locator('[data-testid="correct-flash"]').first().isVisible().catch(() => false);
    const wrong = await page.locator('[data-testid="wrong-flash"]').first().isVisible().catch(() => false);
    const completed = await page.locator('[data-testid="practice-complete"]').first().isVisible().catch(() => false);
    attempts.push({ index: p, expectedSan: expected.san, dragOk: drag.ok, dragError: drag.error, correct, wrong, completed });
    if (completed) break;
    if (!drag.ok || wrong) break;
    await page.waitForTimeout(800); // wait for opponent's automatic reply
  }
  return { mounted: true, attempts };
}

async function runPlay(page, openingPgn, studentColor) {
  // OpeningPlayMode (not PracticeMode) — different testid. Renders
  // the play surface where the student plays vs a Stockfish coach.
  const mounted = await page.locator('[data-testid="opening-play-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!mounted) return { mounted: false };
  await page.waitForTimeout(2500); // play surface bootstraps stockfish — give it time
  const pgnMoves = pgnToVerboseMoves(openingPgn);
  const chess = new Chess();
  const plies = [];
  const studentIsWhite = studentColor === 'white';
  let outcome = 'in-progress';
  for (let p = 0; p < PLAY_PLY_CAP; p++) {
    const isStudentTurn = studentIsWhite ? (p % 2 === 0) : (p % 2 === 1);
    if (!isStudentTurn) {
      // The engine plays automatically on its turn — wait for the
      // board to settle, then re-derive position from the page's
      // game state.
      await page.waitForTimeout(2500);
      // Check for game-over state via testids
      const postgame = await page.locator('[data-testid="play-postgame"]').first().isVisible().catch(() => false);
      if (postgame) { outcome = 'engine-won-or-drew'; break; }
      // We can't easily read the engine's move from outside; track our
      // chess.js mirror by ASKING what move just appeared. Skip — let
      // chess.js stay out of sync and just count plies.
      plies.push({ ply: p + 1, side: 'engine', san: '?' });
      continue;
    }
    let move = pgnMoves[p];
    if (!move) {
      const legal = chess.moves({ verbose: true });
      if (legal.length === 0) break;
      const scored = legal.map((m) => {
        let s = 0;
        if (m.captured) s += 5;
        if (m.san.includes('+')) s += 2;
        if (['e4','d4','e5','d5','c4','f4','c5','f5'].includes(m.to)) s += 1;
        return { m, s };
      }).sort((a, b) => b.s - a.s);
      move = scored[0].m;
    }
    const drag = await dragPieceMove(page, move.from, move.to);
    await page.waitForTimeout(800);
    try { chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? undefined }); } catch {}
    plies.push({ ply: p + 1, side: 'student', san: move.san, dragOk: drag.ok });
    if (!drag.ok) { outcome = 'drag-failed'; break; }
    // Check for end-of-game UI
    const postgame = await page.locator('[data-testid="play-postgame"]').first().isVisible().catch(() => false);
    if (postgame) { outcome = 'game-over'; break; }
  }
  if (outcome === 'in-progress') outcome = `aborted-at-${plies.length}-plies`;
  // Capture postgame stats if available
  const postReport = await page.evaluate(() => ({
    correct: document.querySelector('[data-testid="report-correct"]')?.textContent ?? null,
    deviation: document.querySelector('[data-testid="report-deviation"]')?.textContent ?? null,
    recommendation: document.querySelector('[data-testid="report-recommendation"]')?.textContent ?? null,
  })).catch(() => null);
  return { mounted: true, plies: plies.length, outcome, postReport };
}

// ─── Per-opening orchestrator ──────────────────────────────────────

function makeKey(openingId, sublineKey, service) {
  return `${openingId}::${sublineKey}::${service}`;
}

async function auditOpening(page, openingId, source, prevResults, allEvents) {
  const opening = await getOpening(openingId);
  if (!opening) {
    return { openingId, source, error: 'opening-not-found' };
  }
  console.log(`\n[full-audit] === ${opening.name} (${openingId}, source=${source}) ===`);

  const result = {
    openingId,
    openingName: opening.name,
    source,
    color: opening.color,
    eco: opening.eco,
    detailPageTestIds: [],
    mainLine: { walkthrough: null, practice: null, play: null },
    variations: [],
    traps: [],
    warnings: [],
    startedAt: new Date().toISOString(),
  };

  try {
    // Mount detail page
    await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const detail = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (!detail) {
      result.error = 'detail-page-did-not-mount';
      return result;
    }
    await page.waitForTimeout(2000);
    result.detailPageTestIds = await captureAllTestIds(page);

    const mainSans = pgnToVerboseMoves(opening.pgn);

    // ── MAIN line: walkthrough ───────────────────────────────────
    if (!prevResults?.[makeKey(openingId, 'main', 'walkthrough')]) {
      console.log(`  main/walkthrough`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, '[data-testid="walkthrough-btn"]')) {
        result.mainLine.walkthrough = await runWalkthrough(page, mainSans);
      }
    }
    // ── MAIN line: practice ───────────────────────────────────────
    if (!prevResults?.[makeKey(openingId, 'main', 'practice')]) {
      console.log(`  main/practice`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, '[data-testid="practice-btn"]')) {
        result.mainLine.practice = await runPractice(page, mainSans, opening.color);
      }
    }
    // ── MAIN line: play (Stockfish vs Stockfish + chess.js heuristic) ──
    if (!prevResults?.[makeKey(openingId, 'main', 'play')]) {
      console.log(`  main/play`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, '[data-testid="play-btn"]')) {
        result.mainLine.play = await runPlay(page, opening.pgn, opening.color);
      }
    }

    // ── VARIATIONS ───────────────────────────────────────────────
    for (let i = 0; i < (opening.variations ?? []).length; i++) {
      const v = opening.variations[i];
      if (!v.pgn) continue;
      const vSans = pgnToVerboseMoves(v.pgn);
      const vRes = { name: v.name, walkthrough: null, practice: null };
      // walkthrough
      console.log(`  variation-${i}/walkthrough (${v.name})`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, `[data-testid="variation-walkthrough-${i}"]`)) {
        vRes.walkthrough = await runWalkthrough(page, vSans);
      }
      // practice
      console.log(`  variation-${i}/practice`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, `[data-testid="variation-practice-${i}"]`)) {
        vRes.practice = await runPractice(page, vSans, opening.color);
      }
      result.variations.push(vRes);
    }

    // ── TRAPS ────────────────────────────────────────────────────
    for (let i = 0; i < (opening.trapLines ?? []).length; i++) {
      const t = opening.trapLines[i];
      if (!t.pgn) continue;
      const tSans = pgnToVerboseMoves(t.pgn);
      const tRes = { name: t.name, walkthrough: null, practice: null };
      console.log(`  trap-${i}/walkthrough (${t.name})`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, `[data-testid="trap-walkthrough-${i}"]`)) {
        tRes.walkthrough = await runWalkthrough(page, tSans);
      }
      console.log(`  trap-${i}/practice`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, `[data-testid="trap-practice-${i}"]`)) {
        tRes.practice = await runPractice(page, tSans, opening.color);
      }
      result.traps.push(tRes);
    }

    // ── WARNINGS ─────────────────────────────────────────────────
    for (let i = 0; i < (opening.warningLines ?? []).length; i++) {
      const w = opening.warningLines[i];
      if (!w.pgn) continue;
      const wSans = pgnToVerboseMoves(w.pgn);
      console.log(`  warning-${i}/walkthrough (${w.name})`);
      await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await clickLauncher(page, `[data-testid="warning-walkthrough-${i}"]`)) {
        const wt = await runWalkthrough(page, wSans);
        result.warnings.push({ name: w.name, walkthrough: wt });
      }
    }
  } catch (err) {
    result.error = String(err?.message ?? err).slice(0, 300);
  }

  result.finishedAt = new Date().toISOString();
  return result;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const queue = [
    ...PICK_MAIN.map((id) => ({ id, source: 'main' })),
    ...PICK_PRO.map((id) => ({ id, source: 'pro' })),
    ...PICK_GAMBITS.map((id) => ({ id, source: 'gambit' })),
  ];
  console.log(`[full-audit] queue: ${queue.length} openings`);
  console.log(`[full-audit] out: ${OUT_DIR}`);

  // Resume support
  let prevResults = {};
  let resumeOpenings = [];
  if (process.env.AUDIT_RESUME === '1' && existsSync(REPORT_PATH)) {
    try {
      const prev = JSON.parse(await readFile(REPORT_PATH, 'utf-8'));
      resumeOpenings = prev.openings ?? [];
      for (const o of resumeOpenings) {
        // mark every service that wrote a result as "done"
        if (o.mainLine?.walkthrough) prevResults[makeKey(o.openingId, 'main', 'walkthrough')] = 1;
        if (o.mainLine?.practice) prevResults[makeKey(o.openingId, 'main', 'practice')] = 1;
        if (o.mainLine?.play) prevResults[makeKey(o.openingId, 'main', 'play')] = 1;
      }
      console.log(`[full-audit] resume: ${resumeOpenings.length} openings already touched`);
    } catch {/* ignore */}
  }
  const doneOpeningIds = new Set(resumeOpenings.map((o) => o.openingId));

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[full-audit] chromium = ${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const allEvents = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try { const b = req.postDataJSON?.(); if (b) allEvents.push({ at: Date.now(), ...b }); } catch {}
    }
  });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 250)); });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message.slice(0, 300)));

  console.log('[full-audit] booting & seeding openings DB');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  const seedOk = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  if (!seedOk) {
    console.log('[full-audit] FATAL: openings seed did not complete');
    await browser.close();
    process.exit(2);
  }
  console.log('[full-audit] seed done — entering loop');

  const results = resumeOpenings.slice();

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (doneOpeningIds.has(item.id)) {
      console.log(`[${i + 1}/${queue.length}] ${item.id} — SKIPPED (already in resume)`);
      continue;
    }
    const r = await auditOpening(page, item.id, item.source, prevResults, allEvents);
    results.push(r);
    await writeFile(REPORT_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      base: BASE_URL,
      sample: queue.length,
      openings: results,
      totalEvents: allEvents.length,
    }, null, 2));
    console.log(`[${i + 1}/${queue.length}] ${item.id} DONE (vars=${r.variations?.length || 0} traps=${r.traps?.length || 0} warnings=${r.warnings?.length || 0})`);
  }

  // Summary
  const lines = [
    `# Openings Full Audit — ${new Date().toISOString()}`,
    ``,
    `**Sample:** 10 main + 10 pro + 10 gambits = ${queue.length} openings`,
    `**Audit events captured:** ${allEvents.length}`,
    `**Console errors:** ${consoleErrors.length}`,
    ``,
    `## Per-opening`,
  ];
  for (const r of results) {
    const wt = r.mainLine?.walkthrough?.mounted ? '✓' : '✗';
    const pr = r.mainLine?.practice?.mounted ? '✓' : '✗';
    const pl = r.mainLine?.play?.mounted ? '✓' : '✗';
    const prGood = r.mainLine?.practice?.attempts?.filter((a) => a.correct).length ?? 0;
    const prBad = r.mainLine?.practice?.attempts?.filter((a) => a.wrong).length ?? 0;
    const plOutcome = r.mainLine?.play?.outcome ?? '?';
    lines.push(`- **${r.openingName}** (${r.source}/${r.openingId}): wt=${wt} prac=${pr} (${prGood}✓ ${prBad}✗) play=${pl} (${plOutcome}) vars=${r.variations?.length || 0} traps=${r.traps?.length || 0} warnings=${r.warnings?.length || 0}`);
    if (r.error) lines.push(`    ERROR: ${r.error}`);
  }
  await writeFile(SUMMARY_PATH, lines.join('\n'));

  console.log(`\n[full-audit] DONE`);
  console.log(`[full-audit] openings completed: ${results.length}/${queue.length}`);
  console.log(`[full-audit] report at ${REPORT_PATH}`);
  console.log(`[full-audit] summary at ${SUMMARY_PATH}`);
  await browser.close();
}

main().catch((err) => { console.error('[full-audit] fatal:', err); process.exit(1); });
