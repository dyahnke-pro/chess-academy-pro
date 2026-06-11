#!/usr/bin/env node
/**
 * audit-kid-walkthrough.mjs — David's "personally walk through the kids
 * section" audit. Surveys EVERY /kid/* route against prod, capturing:
 *   - mount success / page+console errors
 *   - the visible on-screen instruction/intro text
 *   - the narration the app actually tries to speak (intercepts /api/tts
 *     request bodies — the text is in the POST body even when TTS 401s
 *     for lack of a prod key in this container)
 *   - a light interaction probe on game surfaces (begin button, one move)
 */
import { chromium } from 'playwright';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/kid-walkthrough-${stamp}`;
await mkdir(OUT, { recursive: true });

const ROUTES = [
  { url: '/kid', label: 'Main hub', mount: '[data-testid="kid-mode-page"],h1,h2' },
  { url: '/kid/puzzles', label: 'Puzzles (generic)', mount: 'main,h1,h2' },
  { url: '/kid/pawn-games', label: 'Pawn hub', mount: 'h1,h2' },
  { url: '/kid/pawn-games/pawn-wars/1', label: 'Pawn Wars L1', mount: 'h1,h2', game: true },
  { url: '/kid/pawn-games/blocker/1', label: 'Blocker L1', mount: 'h1,h2', game: true },
  { url: '/kid/pawn-games/puzzles', label: 'Pawn puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/pawn-games/maze/1', label: 'Pawn maze L1', mount: 'h1,h2', game: true },
  { url: '/kid/pawn-games/sweep/1', label: 'Pawn sweep L1', mount: 'h1,h2', game: true },
  { url: '/kid/rook-games', label: 'Rook hub', mount: 'h1,h2' },
  { url: '/kid/rook-maze/1', label: 'Rook maze L1', mount: 'h1,h2', game: true },
  { url: '/kid/row-clearer/1', label: 'Row Clearer L1', mount: 'h1,h2', game: true },
  { url: '/kid/rook-games/puzzles', label: 'Rook puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/knight-games', label: 'Knight hub', mount: 'h1,h2' },
  { url: '/kid/knight-games/leap-frog', label: 'Leap Frog', mount: 'h1,h2', game: true },
  { url: '/kid/knight-games/knight-sweep', label: 'Knight Sweep', mount: 'h1,h2', game: true },
  { url: '/kid/knight-games/puzzles', label: 'Knight puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/bishop-games', label: 'Bishop hub', mount: 'h1,h2' },
  { url: '/kid/bishop-games/vs-pawns', label: 'Bishop vs Pawns', mount: 'h1,h2', game: true },
  { url: '/kid/bishop-games/color-wars', label: 'Color Wars', mount: 'h1,h2', game: true },
  { url: '/kid/bishop-games/puzzles', label: 'Bishop puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/queen-games', label: 'Queen hub', mount: 'h1,h2' },
  { url: '/kid/queen-games/puzzles', label: 'Queen puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/king-games', label: 'King hub', mount: 'h1,h2' },
  { url: '/kid/king-games/escape', label: 'King Escape', mount: 'h1,h2', game: true },
  { url: '/kid/king-games/march', label: 'King March', mount: 'h1,h2', game: true },
  { url: '/kid/king-games/puzzles', label: 'King puzzles', mount: 'h1,h2', game: true },
  { url: '/kid/journey', label: 'Journey map', mount: 'h1,h2' },
  { url: '/kid/journey/1', label: 'Journey ch.1', mount: 'h1,h2', game: true },
  { url: '/kid/fairy-tale', label: 'Fairy Tale map', mount: 'h1,h2' },
  { url: '/kid/fairy-tale/1', label: 'Fairy Tale ch.1', mount: 'h1,h2', game: true },
  { url: '/kid/play-games', label: 'Play Games hub', mount: 'h1,h2' },
  // ── New surfaces (2026-06-11) ──────────────────────────────────────
  { url: '/kid/queen-games/vs-army', label: 'Queen vs Army', mount: 'h1,h2', game: true },
  { url: '/kid/queen-games/gauntlet', label: "Queen's Gauntlet", mount: 'h1,h2', game: true },
  { url: '/kid/knight-games/army', label: 'Two Knights vs Army', mount: 'h1,h2', game: true },
  { url: '/kid/bishop-games/army', label: 'Two Bishops vs Army', mount: 'h1,h2', game: true },
  { url: '/kid/level-select/knight/race', label: 'Level select (knight race)', mount: '[data-testid="level-select-knight-race"],h2' },
  { url: '/kid/level-select/rook/maze', label: 'Level select (rook maze)', mount: '[data-testid="level-select-rook-maze"],h2' },
  { url: '/kid/knight-games/race/1', label: 'Knight Race L1', mount: 'h2', game: true },
  { url: '/kid/queen-games/race/1', label: 'Queen Race L1', mount: 'h2', game: true },
  { url: '/kid/bishop-games/race/3', label: 'Bishop Race L3', mount: 'h2', game: true },
];

const results = [];

async function dismissOverlays(page) {
  // The strength-calibration onboarding bubble (fixed inset-0 z-110)
  // appears ASYNC on first run — poll a few times so we catch it after
  // it mounts, else it silently intercepts every click (G1 #5).
  for (let i = 0; i < 5; i++) {
    try {
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
      if ((await bubble.count()) && (await bubble.isVisible().catch(() => false))) {
        await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => {});
        await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
        break;
      }
    } catch { /* not present yet */ }
    await page.waitForTimeout(1000);
  }
  try {
    const help = page.locator('[data-testid="page-help-modal"] button').first();
    if (await help.isVisible({ timeout: 800 })) await help.click({ timeout: 800 });
  } catch { /* not present */ }
}

async function run() {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, ...sandboxContextOptions() });
  const page = await ctx.newPage();

  // Capture narration text from /api/tts request bodies + speech-synth.
  const ttsByUrl = new Map();
  page.on('request', (req) => {
    if (req.url().includes('/api/tts')) {
      let text = '';
      try { const d = JSON.parse(req.postData() || '{}'); text = d.text || d.input || ''; } catch { /* */ }
      const key = page.url();
      if (!ttsByUrl.has(key)) ttsByUrl.set(key, []);
      ttsByUrl.get(key).push(text.slice(0, 160));
    }
  });

  // Warm one navigation so the deferred boot + onboarding settles.
  await page.goto(`${BASE}/kid`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await dismissOverlays(page);
  await page.waitForTimeout(1500);

  for (const r of ROUTES) {
    const errs = [];
    const onConsole = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); };
    const onPageErr = (e) => errs.push(`PAGEERROR: ${String(e).slice(0, 200)}`);
    page.on('console', onConsole);
    page.on('pageerror', onPageErr);

    const rec = { url: r.url, label: r.label, mounted: false, instructions: '', narration: [], errors: [], interaction: '' };
    try {
      await page.goto(`${BASE}${r.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await dismissOverlays(page);
      try {
        await page.locator(r.mount).first().waitFor({ state: 'visible', timeout: 12000 });
        rec.mounted = true;
      } catch { rec.mounted = false; }
      await page.waitForTimeout(2500); // let intro narration fire

      // Grab visible instruction-ish text (headings + paragraphs).
      rec.instructions = await page.evaluate(() => {
        const pick = [];
        for (const sel of ['h1', 'h2', 'h3', 'p']) {
          for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 6)) {
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && t.length < 200) pick.push(t);
          }
        }
        return [...new Set(pick)].slice(0, 8).join(' | ');
      });

      // Interaction probe on game surfaces: click a Begin/Start button.
      if (r.game) {
        for (const sel of [
          '[data-testid$="-begin-btn"]', '[data-testid$="begin-btn"]',
          'button:has-text("Begin")', 'button:has-text("Start")', 'button:has-text("Play")',
          'button:has-text("Let")',
        ]) {
          try {
            const b = page.locator(sel).first();
            if (await b.isVisible({ timeout: 600 })) { await b.click({ timeout: 800 }); rec.interaction = `clicked ${sel}`; await page.waitForTimeout(1500); break; }
          } catch { /* */ }
        }
      }
    } catch (e) {
      rec.errors.push(`NAV: ${String(e.message || e).slice(0, 160)}`);
    }
    rec.narration = ttsByUrl.get(`${BASE}${r.url}`) || ttsByUrl.get(page.url()) || [];
    rec.errors.push(...errs.filter((e) => !/tts|anthropic|deepseek|cert|favicon|stockfish|jsdelivr|ERR_BLOCKED|Failed to load resource/i.test(e)));
    page.off('console', onConsole);
    page.off('pageerror', onPageErr);
    results.push(rec);
    const flag = rec.mounted ? (rec.errors.length ? '⚠' : '✓') : '✗';
    console.log(`${flag} ${r.label.padEnd(22)} mount=${rec.mounted} tts=${rec.narration.length} err=${rec.errors.length}`);
    if (rec.errors.length) rec.errors.slice(0, 2).forEach((e) => console.log(`     ! ${e}`));
  }

  await writeFile(`${OUT}/report.json`, JSON.stringify(results, null, 2));
  console.log(`\nReport: ${OUT}/report.json`);
  await browser.close();
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
