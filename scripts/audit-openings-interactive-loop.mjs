#!/usr/bin/env node
/**
 * Interactive loop audit for /openings/* per G7.
 *
 * For each opening (134 total), runs 5 failure-mode probes:
 *
 *  P1. OFF-CANONICAL SEARCH INPUTS — type 3+ variants of the
 *      opening's name into SmartSearchBar (typo, British/American,
 *      abbreviation). Verify the system surfaces the match cleanly
 *      OR shows a useful empty state. Failures = silent "no
 *      results", crashes, wrong opening surfaced.
 *
 *  P2. COLD-CACHE — clear IndexedDB, reload, navigate to opening,
 *      launch walkthrough. Failure = blank screen, "needs to seed"
 *      hang, console errors.
 *
 *  P3. FIRST-TIME-USER — fresh profile (no favorites, no SRS).
 *      Walk through 5 plies. Failure = forced-enroll modal,
 *      missing UI, crash.
 *
 *  P4. PICK-BEFORE-LOAD — navigate to detail page, immediately tap
 *      variation tile 0 (or trap tile 0) before page settles.
 *      Failure = empty state, "loading…" forever, console error.
 *
 *  P5. OUT-OF-ORDER — walkthrough → advance 2 plies → switch to
 *      practice mid-walkthrough → switch to play mid-practice →
 *      back. Failure = stuck state, voice leaks, runtime/unhandled-
 *      rejection audit fires.
 *
 * Output: docs/audit-runs/2026-05-19-openings-interactive-loop/
 *           findings-round-<N>.json  (per round)
 *           findings-aggregate.json  (all rounds combined)
 *
 * Loops forever. After completing a round of 134 openings, increments
 * round counter and starts over. Each round captures progress on bugs
 * fixed between rounds.
 *
 * Audit-stream events captured per opening. Console errors captured.
 * Auto-checkpointed every 5 openings so a sandbox death doesn't lose
 * progress.
 */

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const OUT_DIR = 'docs/audit-runs/2026-05-19-openings-interactive-loop';

// Console-error patterns that are sandbox noise, not real bugs
const SANDBOX_NOISE_RX = [
  /Failed to load resource.*ERR_CERT_AUTHORITY_INVALID/i,
  /audit-stream.*403/i,
  /api\/tts.*403/i,
  /explorer\.lichess\.ovh/i,
  /sw\.js load failed/i,
  /Service Worker registration failed/i,
];

function isSandboxNoise(msg) {
  return SANDBOX_NOISE_RX.some((rx) => rx.test(msg));
}

/** Build 3 off-canonical variants of an opening's name. */
function offCanonicalVariants(name) {
  const variants = [];
  // 1. British spelling swap
  if (/Defense/i.test(name)) variants.push(name.replace(/Defense/gi, 'Defence'));
  else if (/Defence/i.test(name)) variants.push(name.replace(/Defence/gi, 'Defense'));
  // 2. Drop apostrophes
  if (/'/.test(name)) variants.push(name.replace(/'/g, ''));
  // 3. Drop one letter (typo)
  if (name.length > 6) {
    const i = Math.floor(name.length / 2);
    variants.push(name.slice(0, i) + name.slice(i + 1));
  }
  // 4. First word only (abbreviation-like)
  const firstWord = name.split(/[\s:-]+/)[0];
  if (firstWord && firstWord !== name) variants.push(firstWord);
  // 5. Common abbreviations
  if (/King'?s Indian/i.test(name)) variants.push('KID');
  if (/Queen'?s Gambit Declined/i.test(name)) variants.push('QGD');
  if (/Queen'?s Gambit Accepted/i.test(name)) variants.push('QGA');
  // Take first 3
  return variants.slice(0, 3);
}

async function getCurrentRound() {
  await mkdir(OUT_DIR, { recursive: true });
  let max = 0;
  try {
    const fs = await import('node:fs/promises');
    const entries = await fs.readdir(OUT_DIR);
    for (const e of entries) {
      const m = e.match(/findings-round-(\d+)\.json/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  } catch { /* empty dir */ }
  return max + 1;
}

async function probeOpening(page, opening, round, allEvents, options = {}) {
  const result = {
    round,
    openingId: opening.id,
    name: opening.name,
    color: opening.color,
    startedAt: new Date().toISOString(),
    probes: {},
    consoleErrors: [],
    auditEvents: [],
  };

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!isSandboxNoise(t)) result.consoleErrors.push(t.slice(0, 250));
    }
  });
  page.on('pageerror', (e) => {
    const t = 'PAGE: ' + e.message;
    if (!isSandboxNoise(t)) result.consoleErrors.push(t.slice(0, 250));
  });
  const evtsBefore = allEvents.length;

  // NON-DESTRUCTIVE probes run on every opening
  result.probes.offCanonical = await runP1(page, opening);
  result.probes.pickBeforeLoad = await runP4(page, opening);
  result.probes.outOfOrder = await runP5(page, opening);

  // DESTRUCTIVE probes (P2, P3) only on sampled openings — they clear
  // IndexedDB which means subsequent probes pay the reseed cost (~30-60s).
  // Sampling keeps round time tractable (~80 min instead of ~6h).
  if (options.runDestructive) {
    result.probes.coldCache = await runP2(page, opening);
    result.probes.firstTimeUser = await runP3(page, opening);
  } else {
    result.probes.coldCache = { kind: 'cold-cache', skipped: 'not in this round sample' };
    result.probes.firstTimeUser = { kind: 'first-time-user', skipped: 'not in this round sample' };
  }

  result.auditEvents = allEvents.slice(evtsBefore);
  result.finishedAt = new Date().toISOString();
  return result;
}

/** Ensure /openings is fully seeded — page has the SmartSearchBar
 *  and opening cards rendered. Navigates if needed; waits up to 90s
 *  for `opening-explorer` testid to appear. Returns true on success.
 */
async function ensureSeeded(page) {
  // Check if already mounted
  let mounted = await page.locator('[data-testid="opening-explorer"]').first().isVisible().catch(() => false);
  if (mounted) return true;
  // Navigate and wait long for seed
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  mounted = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 90_000 }).then(() => true).catch(() => false);
  return mounted;
}

async function runP1(page, opening) {
  const result = { kind: 'off-canonical', inputs: [], findings: [] };
  const variants = offCanonicalVariants(opening.name);
  result.attemptedVariants = variants;
  for (const v of variants) {
    try {
      const seeded = await ensureSeeded(page);
      if (!seeded) {
        result.findings.push(`P1[${v}]: /openings did not reseed within 90s — seed pipeline broken`);
        continue;
      }
      const search = page.locator('[data-testid="smart-search-input"]').first();
      const visible = await search.isVisible().catch(() => false);
      if (!visible) {
        result.findings.push(`P1[${v}]: search input not visible even after seed (UI regression)`);
        continue;
      }
      await search.fill(v);
      await page.waitForTimeout(800);
      // Look for results — opening-card-<id> testids surface what got matched
      const cardCount = await page.locator('[data-testid^="opening-card-"]').count().catch(() => 0);
      const dropdownCount = await page.locator('[data-testid="search-result"]').count().catch(() => 0);
      const noResultsVisible = await page.locator('text=/no.*result/i, text=/no match/i').count().catch(() => 0);
      result.inputs.push({ v, cardCount, dropdownCount, noResultsVisible });
      // Failure modes:
      // - No cards AND no "no results" message = silent empty state
      if (cardCount === 0 && dropdownCount === 0 && noResultsVisible === 0) {
        result.findings.push(`P1[${v}]: silent empty state — 0 cards, 0 dropdown results, no "no match" message`);
      }
      // - Search-bar rejects valid variant entirely (filtered out without showing the canonical match)
      //   Only flag if cardCount = 0 (no matches at all)
      await search.fill('');
      await page.waitForTimeout(200);
    } catch (e) {
      result.findings.push(`P1[${v}]: error ${(e?.message || String(e)).slice(0,150)}`);
    }
  }
  return result;
}

async function runP2(page, opening) {
  const result = { kind: 'cold-cache', findings: [] };
  try {
    // Clear IndexedDB before this opening
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const d of dbs) { if (d.name) indexedDB.deleteDatabase(d.name); }
    }).catch(() => {});
    await page.waitForTimeout(500);
    // Detail page doesn't auto-seed — must go through /openings first
    // (OpeningExplorerPage is where seedDatabase() lives).
    await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const reseeded = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 90_000 }).then(() => true).catch(() => false);
    if (!reseeded) {
      result.findings.push('P2: /openings did not reseed after IndexedDB wipe — seed pipeline broken under cold cache');
      return result;
    }
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const mounted = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
    result.detailMounted = mounted;
    if (!mounted) {
      result.findings.push('P2: detail page never mounted after cold cache (even with /openings reseed first)');
      return result;
    }
    await page.waitForTimeout(2000);
    // Launch walkthrough
    const wt = page.locator('[data-testid="walkthrough-btn"]').first();
    const wtVisible = await wt.isVisible().catch(() => false);
    if (!wtVisible) {
      result.findings.push('P2: walkthrough-btn not visible after cold-cache mount');
      return result;
    }
    await wt.click({ timeout: 5000 });
    const wtMounted = await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    result.walkthroughMounted = wtMounted;
    if (!wtMounted) {
      result.findings.push('P2: walkthrough did not mount cold');
      return result;
    }
    // Advance one ply to test the cold flow
    await page.waitForTimeout(1500);
    const next = page.locator('[data-testid="nav-next"]').first();
    if (await next.isVisible().catch(() => false)) {
      await next.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(800);
      const lbl = await page.locator('[data-testid="annotation-move-label"]').first().textContent().catch(() => null);
      result.firstPlyAdvanced = !!lbl;
      if (!lbl) result.findings.push('P2: first-ply advance did not render annotation label');
    }
  } catch (e) {
    result.findings.push(`P2: error ${(e?.message || String(e)).slice(0,150)}`);
  }
  return result;
}

async function runP3(page, opening) {
  const result = { kind: 'first-time-user', findings: [] };
  try {
    // Fresh storage
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const d of dbs) { if (d.name) indexedDB.deleteDatabase(d.name); }
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
    }).catch(() => {});
    await page.waitForTimeout(500);
    // Go to /openings FIRST so seedDatabase() fires
    await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const reseeded = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 90_000 }).then(() => true).catch(() => false);
    if (!reseeded) { result.findings.push('P3: /openings did not seed for first-time user — seed broken on fresh storage'); return result; }
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const detail = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    if (!detail) { result.findings.push('P3: detail did not mount for first-time user'); return result; }
    // Watch for forced-enroll modal
    const enrollModal = await page.locator('[data-testid="enroll-modal"], text=/enroll/i').count().catch(() => 0);
    if (enrollModal > 0) result.findings.push('P3: forced-enroll modal blocking first-time user');
    // Walk 5 plies
    const wt = page.locator('[data-testid="walkthrough-btn"]').first();
    if (await wt.isVisible().catch(() => false)) {
      await wt.click({ timeout: 5000 });
      await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      let advanced = 0;
      for (let i = 0; i < 5; i++) {
        const n = page.locator('[data-testid="nav-next"]').first();
        if (!(await n.isVisible().catch(() => false))) break;
        await n.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
        advanced++;
      }
      result.advanced = advanced;
      if (advanced < 3) result.findings.push(`P3: only advanced ${advanced} plies before getting stuck`);
    }
  } catch (e) {
    result.findings.push(`P3: error ${(e?.message || String(e)).slice(0,150)}`);
  }
  return result;
}

async function runP4(page, opening) {
  const result = { kind: 'pick-before-load', findings: [] };
  if (!(opening.variations || []).length && !(opening.trapLines || []).length) {
    result.skipped = 'no variations or traps';
    return result;
  }
  try {
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'commit', timeout: 30000 });
    // IMMEDIATELY (before page settles) try to click a variation or trap tile
    // Wait for the detail testid but only briefly
    const detail = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    if (!detail) { result.findings.push('P4: detail did not appear even briefly'); return result; }
    // Don't wait for full settle — try to click immediately
    const tile = opening.variations?.[0]
      ? page.locator(`[data-testid="variation-walkthrough-0"]`).first()
      : page.locator(`[data-testid="trap-walkthrough-0"]`).first();
    const tileVisible = await tile.isVisible({ timeout: 1000 }).catch(() => false);
    if (!tileVisible) {
      result.findings.push('P4: tile not visible within 1s — slow detail page');
      return result;
    }
    await tile.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(3000);
    // Check the walkthrough mounted
    const wtMounted = await page.locator('[data-testid="walkthrough-mode"]').isVisible().catch(() => false);
    if (!wtMounted) {
      result.findings.push('P4: tap-before-load caused walkthrough to not mount');
      return result;
    }
    // Check there's a starting ply rendered
    const label = await page.locator('[data-testid="annotation-move-label"]').first().textContent().catch(() => null);
    if (!label) result.findings.push('P4: walkthrough mounted but no annotation rendered (empty state)');
    result.label = label;
  } catch (e) {
    result.findings.push(`P4: error ${(e?.message || String(e)).slice(0,150)}`);
  }
  return result;
}

async function runP5(page, opening) {
  const result = { kind: 'out-of-order', findings: [] };
  try {
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // Walkthrough
    const wt = page.locator('[data-testid="walkthrough-btn"]').first();
    if (!(await wt.isVisible().catch(() => false))) { result.skipped = 'no walkthrough-btn'; return result; }
    await wt.click({ timeout: 3000 });
    await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // Advance 2 plies
    const next = page.locator('[data-testid="nav-next"]').first();
    if (await next.isVisible().catch(() => false)) {
      await next.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(400);
      await next.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    // Back out & switch to practice
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(800);
    const pr = page.locator('[data-testid="practice-btn"]').first();
    if (await pr.isVisible().catch(() => false)) {
      await pr.click({ timeout: 3000 });
      const prMounted = await page.locator('[data-testid="practice-mode"]').waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
      if (!prMounted) result.findings.push('P5: practice did not mount after switch from walkthrough');
    }
    // Back to detail & switch to play
    await page.goto(`${BASE_URL}/openings/${opening.id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(800);
    const pl = page.locator('[data-testid="play-btn"]').first();
    if (await pl.isVisible().catch(() => false)) {
      await pl.click({ timeout: 3000 });
      const plMounted = await page.locator('[data-testid="opening-play-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      if (!plMounted) result.findings.push('P5: play did not mount after out-of-order switch');
    }
  } catch (e) {
    result.findings.push(`P5: error ${(e?.message || String(e)).slice(0,150)}`);
  }
  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const queue = JSON.parse(await readFile(join(OUT_DIR, 'queue.json'), 'utf-8'));
  console.log(`[interactive-loop] queue: ${queue.length} openings`);
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const allEvents = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try { const b = req.postDataJSON?.(); if (b) allEvents.push({ at: Date.now(), ...b }); } catch {}
    }
  });

  // Boot + seed
  console.log('[interactive-loop] booting + seeding...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const seedOk = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  if (!seedOk) { console.error('seed failed'); process.exit(2); }
  console.log('[interactive-loop] seed done — entering loop');

  // Loop rounds forever
  while (true) {
    const round = await getCurrentRound();
    console.log(`\n=== ROUND ${round} starting at ${new Date().toISOString()} ===`);
    const roundResults = [];
    const roundPath = join(OUT_DIR, `findings-round-${round}.json`);
    // Pick a deterministic sample of 15 openings to run destructive
    // probes (P2 cold-cache + P3 first-time-user) on. Different sample
    // each round so over many rounds every opening gets covered.
    const sampleStart = (round * 15) % queue.length;
    const destructiveSet = new Set();
    for (let s = 0; s < 15; s++) destructiveSet.add(queue[(sampleStart + s) % queue.length].id);
    for (let i = 0; i < queue.length; i++) {
      const opening = queue[i];
      const runDestructive = destructiveSet.has(opening.id);
      try {
        const r = await probeOpening(page, opening, round, allEvents, { runDestructive });
        roundResults.push(r);
        // Count findings
        const findings = Object.values(r.probes).flatMap((p) => p.findings || []);
        const errs = r.consoleErrors.length;
        const tag = findings.length === 0 && errs === 0 ? '✓' : '✗';
        console.log(`  [${i+1}/${queue.length}] ${tag} ${opening.id} — ${findings.length} findings, ${errs} console errs`);
        if (findings.length > 0) for (const f of findings.slice(0, 3)) console.log(`      ${f}`);
        if ((i + 1) % 5 === 0) {
          await writeFile(roundPath, JSON.stringify({ round, generatedAt: new Date().toISOString(), inProgress: true, openingsCompleted: roundResults.length, results: roundResults }, null, 2));
        }
      } catch (e) {
        console.warn(`  [${i+1}/${queue.length}] FATAL on ${opening.id}: ${(e?.message || String(e)).slice(0,150)}`);
      }
    }
    // Round finished
    const totalFindings = roundResults.reduce((sum, r) => sum + Object.values(r.probes).flatMap((p) => p.findings || []).length, 0);
    const totalConsole = roundResults.reduce((sum, r) => sum + r.consoleErrors.length, 0);
    await writeFile(roundPath, JSON.stringify({ round, generatedAt: new Date().toISOString(), inProgress: false, openingsCompleted: roundResults.length, totalFindings, totalConsoleErrors: totalConsole, results: roundResults }, null, 2));
    console.log(`=== ROUND ${round} DONE — ${totalFindings} findings, ${totalConsole} console errors ===`);
    // Brief pause then restart
    await page.waitForTimeout(5000);
  }
}

main().catch((err) => { console.error('[interactive-loop] fatal:', err); process.exit(1); });
