// Personal interactive walk of ANY masterclass opening (set AUDIT_OPENING). — captures concrete
// per-tab evidence (tab labels, gem tiles + order + tier, model game, key
// ideas, distinct lesson titles, and decoded /api/tts so we can read the
// Watch prose vs Learn cue). NOT the pass/fail loop — this is the "tell me
// exactly what happens on every tab" walk David asked for.
//
//   AUDIT_SMOKE_URL=http://localhost:5173 \
//   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//   AUDIT_OPENING=ruy-lopez node scripts/audit-opening-walkthrough.mjs

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ID = process.env.AUDIT_OPENING ?? 'vienna-game';

function ttsTextOf(url) {
  const m = url.match(/[?&]text=([^&]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
const isWarmup = (t) => t.trim() === '.' || t.trim() === '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The "How to use a Masterclass" help auto-opens on first visit (our new
// PageHelp feature) and is a modal — dismiss it so it doesn't intercept clicks.
async function closeHelp(page) {
  const modal = page.locator('[data-testid="page-help-modal"]');
  if (await modal.count()) {
    await page.locator('[data-testid="page-help-close"]').first().click().catch(() => {});
    await modal.first().waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  }
}

async function main() {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const tts = [];
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) tts.push({ t: Date.now(), text: ttsTextOf(r.url()) }); });

  const out = [];
  const log = (s) => { out.push(s); console.log(s); };

  // Boot-seed: visit / first so dataLoader populates Dexie with the
  // masterclass openings, else the detail page renders "Opening not found".
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  await page.goto(`${URL}/openings`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await page.goto(`${URL}/openings/${ID}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="variation-tabs"]').first().waitFor({ timeout: 20000 });
  await sleep(800);
  await closeHelp(page);

  // Tab strip
  const mainLabel = (await page.locator('[data-testid="variation-tab-main"]').innerText().catch(() => '')).trim();
  const tabBtns = page.locator('[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])');
  const n = await tabBtns.count();
  const tabs = [{ idx: -1, label: mainLabel, testid: 'variation-tab-main' }];
  for (let i = 0; i < n; i++) {
    const el = tabBtns.nth(i);
    const tid = await el.getAttribute('data-testid');
    const label = (await el.innerText()).trim();
    tabs.push({ idx: Number(tid.replace('variation-tab-', '')), label, testid: tid });
  }
  log(`\n=== TAB STRIP: ${tabs.length} tabs ===`);
  tabs.forEach((t) => log(`  • ${t.label}  (${t.testid})`));

  const lessonTitles = [];
  for (const tab of tabs) {
    log(`\n=== TAB: ${tab.label} ===`);
    await closeHelp(page);
    await page.locator(`[data-testid="${tab.testid}"]`).click();
    await sleep(700);

    // Gems
    const gemCards = page.locator('[data-testid^="punish-gem-"]');
    const gc = await gemCards.count();
    log(`  gems: ${gc}`);
    for (let i = 0; i < gc; i++) {
      const txt = (await gemCards.nth(i).innerText()).replace(/\s+/g, ' ').trim();
      log(`    ${i + 1}. ${txt.slice(0, 130)}`);
    }

    // Named traps
    const trapCards = page.locator('[data-testid^="named-trap-"]:not([data-testid*="watch"]):not([data-testid*="learn"]):not([data-testid*="practice"]):not([data-testid*="play"])');
    const tc = await trapCards.count();
    if (tc) {
      log(`  named traps: ${tc}`);
      for (let i = 0; i < Math.min(tc, 8); i++) {
        const txt = (await trapCards.nth(i).innerText()).replace(/\s+/g, ' ').trim();
        log(`    - ${txt.slice(0, 90)}`);
      }
    }

    // Model game present?
    const mg = await page.locator('text=/vs|1-0|0-1/').first().count().catch(() => 0);
    const modelBtn = await page.getByText(/model game|watch the game|grandmaster/i).count().catch(() => 0);
    log(`  model-game signal: ${modelBtn > 0 ? 'present' : (mg > 0 ? 'maybe' : 'none-detected')}`);

    // Watch the lesson for this tab — capture the lesson title + TTS prose
    tts.length = 0;
    await page.locator('[data-testid="walkthrough-btn"]').click();
    await page.locator('[data-testid="lesson-player"]').waitFor({ timeout: 12000 }).catch(() => {});
    const title = (await page.locator('[data-testid="lesson-title"]').innerText().catch(() => '(no title)')).trim();
    await sleep(6500);
    const prose = tts.map((r) => r.text).filter((t) => t && !isWarmup(t));
    const uniqProse = [...new Set(prose)];
    lessonTitles.push({ tab: tab.label, title, firstProse: uniqProse[0] || '(none)', count: uniqProse.length });
    log(`  WATCH lesson-title: "${title}"`);
    log(`  WATCH distinct tts lines: ${uniqProse.length}`);
    uniqProse.slice(0, 2).forEach((t, i) => log(`    say[${i}]: ${t.slice(0, 120)}`));
    // Exit the lesson back to the detail view (same route — no re-nav).
    await page.locator('button[aria-label="Exit lesson"]').click().catch(() => {});
    await page.locator('[data-testid="variation-tabs"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    await sleep(400);
  }

  log(`\n=== LESSON DISTINCTNESS (lesson title per tab) ===`);
  const seen = new Map();
  lessonTitles.forEach((l) => {
    const dup = [...seen.entries()].find(([, v]) => v === l.title && l.title !== '(no title)');
    log(`  ${l.tab}: "${l.title}" ${dup ? `⚠ DUP with ${dup[0]}` : '✓ distinct'}`);
    seen.set(l.tab, l.title);
  });

  log(`\n=== PAGE ERRORS: ${errs.length} ===`);
  errs.slice(0, 10).forEach((e) => log(`  ${e}`));

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
