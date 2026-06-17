// G1 audit — The Academy course surfaces (Masterclasses / Counter-Weapons /
// Gambits shelves, the course syllabus, and the Spar trainer). The course
// feature is deterministic (no LLM), so this verifies RENDER + interaction +
// zero page/error-boundary failures. When narration (Stage-2) lands and routes
// through the coach grounding architecture, extend this with the narration-
// listener + audit-stream instruments (it inherits the coach's claim validators).
//
// Usage: AUDIT_SANDBOX=1 [AUDIT_SMOKE_URL=https://…] node scripts/audit-academy-courses.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results = [];
const record = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 900 } });
// Auto-neutralize the strength-calibration bubble on EVERY navigation so it
// can't re-appear on a fresh-context surface mount and intercept clicks
// (it re-rendered over the subline buttons — known G1 fresh-context issue).
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 });
    await page.click('[data-testid="skill-band-intermediate"]');
    await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { state: 'detached', timeout: 15000 });
  } catch { /* no bubble */ }

  // Academy shelves (anti/gambits seed in the deferred backfill → re-poll)
  await page.goto(`${BASE}/academy`, { waitUntil: 'domcontentloaded' });
  try { await page.click('[data-testid="page-help-modal"] button', { timeout: 2500 }); } catch { /* none */ }
  let mc = 0, anti = 0, gam = 0;
  for (let i = 0; i < 30; i++) {
    mc = await page.locator('[data-testid="academy-section-masterclasses"]').count();
    anti = await page.locator('[data-testid="academy-section-anti"]').count();
    gam = await page.locator('[data-testid="academy-section-gambits"]').count();
    if (mc && anti && gam) break;
    await page.waitForTimeout(3000);
  }
  record('Academy: Masterclasses shelf', mc > 0);
  record('Academy: Counter-Weapons (anti) shelf', anti > 0);
  record('Academy: Gambits shelf', gam > 0);

  // A masterclass course syllabus (two-level tree)
  await page.goto(`${BASE}/academy/course/caro-kann`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="course-cover"]', { timeout: 30000 });
  const mcChapters = await page.locator('[data-testid^="course-chapter-"]').count();
  const mcSublines = await page.locator('[data-testid^="course-sublines-"]').count();
  record('Masterclass syllabus renders (chapters + sublines)', mcChapters > 0 && mcSublines > 0, `chapters=${mcChapters} subline-blocks=${mcSublines}`);
  record('Masterclass syllabus has Resume + Spar', (await page.locator('[data-testid="course-resume"]').count()) > 0 && (await page.locator('[data-testid="course-spar"]').count()) > 0);

  // Level-3 subline Watch + Play (David 2026-06-17). Each "They might play"
  // deviation carries a Watch (narrated walkthrough) and a Play (OpeningPlayMode
  // customLine lock) action. Verify both mount their player.
  const watchBtns = await page.locator('[data-testid^="subline-watch-"]').count();
  const playBtns = await page.locator('[data-testid^="subline-play-"]').count();
  record('Sublines carry Watch + Play actions', watchBtns > 0 && playBtns > 0, `watch=${watchBtns} play=${playBtns}`);

  await page.locator('[data-testid^="subline-watch-"]').first().click();
  const watchMounted = await page.locator('[data-testid="replay-demo"], [data-testid="skip-to-memory"], [data-testid="line-exit"]')
    .first().isVisible({ timeout: 20000 }).catch(() => false);
  record('Subline Watch mounts the walkthrough player', watchMounted);
  await page.locator('[data-testid="line-exit"]').first().click({ timeout: 5000 }).catch(() => {});

  await page.goto(`${BASE}/academy/course/caro-kann`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="course-chapters"]', { timeout: 30000 });
  await page.locator('[data-testid^="subline-play-"]').first().click();
  const playMounted = await page.locator('[data-testid="opening-play-mode"]').first().isVisible({ timeout: 20000 }).catch(() => false);
  record('Subline Play mounts OpeningPlayMode (customLine lock)', playMounted);
  await page.goto(`${BASE}/academy`, { waitUntil: 'domcontentloaded' });

  // An anti-opening course syllabus
  await page.goto(`${BASE}/academy/course/anti-sicilian-rossolimo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="course-cover"]', { timeout: 30000 });
  record('Anti-opening syllabus renders', (await page.locator('[data-testid^="course-chapter-"]').count()) > 0);

  // The Spar trainer mounts + board + prompt, no crash
  await page.goto(`${BASE}/academy/course/anti-sicilian-rossolimo/train`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="course-trainer"]', { timeout: 20000 });
  await page.waitForTimeout(2000);
  const crashed = await page.getByText('Something went wrong').count();
  const squares = await page.locator('[data-square]').count();
  const prompt = await page.locator('[data-testid="trainer-prompt"]').count();
  record('Trainer mounts (board + prompt, no crash)', crashed === 0 && squares === 64 && prompt > 0, `squares=${squares} prompt=${prompt} crashed=${crashed}`);

  record('No uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  record('FATAL', false, e.message);
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
const dir = `audit-reports/academy-courses-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, passed, total: results.length, pageErrors, results }, null, 2));
console.log(`\n${passed}/${results.length} green · report: ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
