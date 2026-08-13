// Drive prod the way DAVID uses the app — by hand, step by step, reading the
// screen between clicks (the locked hand-driven standard). Two claims shipped
// tonight that unit tests cannot prove:
//
//  A. A RETURNING USER with a lesson cached at yesterday's generator revision
//     gets it evicted and regenerated — the gen-rev bump doing its one job.
//     Every earlier audit ran a fresh browser (cold cache, always
//     regenerates), so this path had literally never been watched.
//
//  B. A user who sets 中文 + Brief in the real Settings UI hears the coach in
//     Chinese, briefly. This also happens to be the first live proof that the
//     translation chokepoint works on prod at all.
//
// Muted throughout — the spoken text is read from the app's own narration
// events, so nothing is billed and nothing is fabricated.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const STALE_REV = '2026-08-12-authored-tier-spelling';
const OUT = `audit-reports/as-david-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const CJK = /[　-鿿豈-﫿]/;

const log = (m) => console.log(`  ${m}`);
const step = (m) => console.log(`\n■ ${m}`);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();

  const events = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit') || req.method() !== 'POST') return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      for (const e of (body.events ?? body.entries ?? [body])) events.push(e);
    } catch { /* not ours */ }
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});

  // ── Open the app like a first launch ─────────────────────────────────────
  step('open /coach/teach, deal with whatever pops up');
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  for (const [wait, click] of [
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
  ]) {
    const seen = await page.locator(wait).first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
    if (seen) { await page.locator(click).first().click({ timeout: 8000, force: true }); log(`dismissed ${wait}`); await sleep(1000); }
  }
  await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 60_000 });
  await shot('01-teach-open');

  // ── A. Become yesterday's user: plant a lesson cached at the OLD rev ─────
  step(`plant a cached lesson at the old rev (${STALE_REV}) — the state a returning device is actually in`);
  const seeded = await page.evaluate(async ({ rev }) => {
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve('open-failed');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cachedOpenings')) { resolve('no-store'); return; }
        const tx = db.transaction('cachedOpenings', 'readwrite');
        tx.objectStore('cachedOpenings').put({
          normalizedName: 'caro-kann defense: classical variation',
          name: 'Caro-Kann Defense: Classical Variation',
          eco: 'B18',
          genRev: rev,
          generatedAt: Date.now() - 86_400_000,
          tree: { openingName: 'Caro-Kann Defense: Classical Variation', stale: true },
        });
        tx.oncomplete = () => resolve('seeded');
        tx.onerror = () => resolve('tx-failed');
      };
    });
  }, { rev: STALE_REV });
  log(`seed result: ${seeded}`);
  if (seeded !== 'seeded') throw new Error(`could not plant the stale cache row: ${seeded}`);

  step('ask for that exact opening, the way a returning user would');
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.click();
  await box.pressSequentially('teach me the Caro-Kann Defense: Classical Variation', { delay: 10 });
  await page.locator('[data-testid="chat-send-btn"]').click();

  // Watch for the eviction, then the regeneration, then a lesson actually on
  // screen. Each is a separate observation — an eviction that never turns into
  // a fresh lesson is a worse bug than no eviction.
  const waitEvent = async (pred, label, ms) => {
    const dl = Date.now() + ms;
    while (Date.now() < dl) {
      const hit = events.find(pred);
      if (hit) { log(`saw: ${(hit.summary ?? '').slice(0, 110)}`); return hit; }
      await sleep(1000);
    }
    log(`NOT SEEN within ${ms / 1000}s: ${label}`);
    return null;
  };
  const invalidated = await waitEvent(
    (e) => e.kind === 'opening-cache-invalidated' && (e.summary ?? '').includes('genRev'),
    'opening-cache-invalidated (genRev)', 30_000);
  const regenerated = await waitEvent(
    (e) => (e.summary ?? '').includes('generation OK') && (e.summary ?? '').toLowerCase().includes('caro'),
    'fresh generation for the Caro', 240_000);
  const lessonUp = await page.locator(
    '[data-testid="walkthrough-narrating-panel"], [data-testid="walkthrough-choose-mode"]',
  ).first().waitFor({ state: 'visible', timeout: 60_000 }).then(() => true).catch(() => false);
  log(`lesson on screen: ${lessonUp}`);
  await shot('02-caro-after-eviction');

  // ── B. Settings, like a user: 中文 + Brief ─────────────────────────────────
  step('go to Settings and actually click the controls');
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-testid="settings-page"]').waitFor({ state: 'visible', timeout: 30_000 });
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.isVisible().catch(() => false)) {
    await page.locator('[data-testid="page-help-close"]').click({ timeout: 5000, force: true }).catch(() => {});
  }
  await sleep(1000);
  // The two controls live in different tabs. The tab strip is
  // `data-testid="tab-<id>"` — the first cut guessed generic selectors
  // (role="tab", nav button), matched nothing, and reported the SETTINGS
  // page broken when only the audit's map of it was.
  const findInTabs = async (selector) => {
    if (await page.locator(selector).first().isVisible().catch(() => false)) return 'already visible';
    const tabs = page.locator('[data-testid^="tab-"]');
    const n = await tabs.count();
    for (let i = 0; i < n; i += 1) {
      const label = (await tabs.nth(i).innerText().catch(() => '')).trim();
      await tabs.nth(i).click({ timeout: 3000, force: true }).catch(() => {});
      await sleep(700);
      if (await page.locator(selector).first().isVisible().catch(() => false)) return `tab "${label}"`;
    }
    return null;
  };

  const langWhere = await findInTabs('[data-testid="narration-language-select"]');
  log(`language select found in: ${langWhere}`);
  if (langWhere) {
    await page.locator('[data-testid="narration-language-select"]').selectOption('zh');
    log('set narration language → 中文');
  }
  // Coach Narration lives INSIDE the "Gameplay Coaching" modal on the Coach
  // tab — a real user clicks the row and the dialog opens. The first two cuts
  // hunted for the select on the tab surface and reported the SETTINGS UI
  // unreachable; the only thing unreachable was an audit that would not click
  // the button in front of it.
  let briefWhere = await findInTabs('[data-testid="gameplay-coaching-row"]');
  log(`Gameplay Coaching row found in: ${briefWhere}`);
  if (briefWhere) {
    await page.locator('[data-testid="gameplay-coaching-row"]').click({ timeout: 5000, force: true });
    await sleep(800);
    const sel = page.locator('[data-testid="coach-narration-select"]');
    if (await sel.isVisible().catch(() => false)) {
      await sel.selectOption('brief');
      log('set Coach Narration → Brief (inside the modal)');
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(500);
    } else {
      briefWhere = null;
      log('modal opened but the select never appeared');
    }
  }
  await shot('03-settings-zh-brief');
  if (!langWhere || !briefWhere) throw new Error('could not reach both settings controls through the UI');

  // ── Listen to a lesson with those settings ───────────────────────────────
  step('back to teach; take a lesson and read every line the coach speaks');
  const spokenBefore = events.length;
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('[data-testid="chat-text-input"]').click();
  await page.locator('[data-testid="chat-text-input"]').pressSequentially('Vienna Game: Frankenstein-Dracula Variation', { delay: 10 });
  await page.locator('[data-testid="chat-send-btn"]').click();
  // Let it narrate a while; nudge it along like a viewer who taps next.
  const until = Date.now() + 150_000;
  while (Date.now() < until) {
    const skip = page.locator('[data-testid="walkthrough-skip"]');
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 2000 }).catch(() => {});
    await sleep(4000);
  }
  await shot('04-lesson-in-chinese');

  const spoken = events.slice(spokenBefore)
    .filter((e) => e.kind === 'coach-narration-spoken' && (e.narrationText ?? '').trim())
    .map((e) => e.narrationText.trim());
  const zh = spoken.filter((t) => CJK.test(t));
  const sentencesOf = (t) => (t.match(/[。！？]|[.!?](?=\s|$)/g) ?? []).length || 1;
  step('what the coach actually said');
  for (const t of spoken.slice(0, 20)) log(`${CJK.test(t) ? 'ZH' : 'EN'} [${sentencesOf(t)}s] ${t.slice(0, 90)}`);
  const longest = Math.max(0, ...zh.map(sentencesOf));

  const report = {
    base: BASE, staleRev: STALE_REV,
    cacheEvicted: !!invalidated, regenerated: !!regenerated, lessonUp,
    settingsReached: { language: langWhere, verbosity: briefWhere },
    spokenLines: spoken.length, chineseLines: zh.length, longestZhSentences: longest,
    pageErrors, spoken: spoken.slice(0, 40),
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();

  console.log('\n──────── AS DAVID WOULD ────────');
  console.log(`A. stale cache evicted        ${invalidated ? '✅' : '❌'}`);
  console.log(`   regenerated fresh          ${regenerated ? '✅' : '❌'}`);
  console.log(`   lesson reached the screen  ${lessonUp ? '✅' : '❌'}`);
  console.log(`B. settings set via real UI   ${langWhere && briefWhere ? '✅' : '❌'}`);
  console.log(`   coach spoke Chinese        ${zh.length > 0 ? `✅ (${zh.length}/${spoken.length} lines)` : '❌'}`);
  console.log(`   longest zh line            ${longest} sentence(s)`);
  console.log(`page errors                   ${pageErrors.length}`);
  console.log(`report                        ${OUT}/report.json`);
  const ok = invalidated && regenerated && lessonUp && zh.length > 0 && pageErrors.length === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });
