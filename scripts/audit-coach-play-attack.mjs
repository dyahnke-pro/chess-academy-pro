// ADVERSARIAL pass for Play with Coach — per AUDIT_PROTOCOL.md §0/§2: try hard
// to BREAK it. Rapid-fire, out-of-order, illegal moves, mid-action interrupts,
// pick-before-load, double-submit. Captures every console + page error and
// verifies the surface survives (stays mounted, recovers).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const findings = [];
const note = (attack, broke, detail = '') => { findings.push({ attack, broke, detail }); console.log(`${broke ? '💥' : '✓'} ${attack}${detail ? ` — ${detail}` : ''}`); };
const sel = (t) => `[data-testid="${t}"]`;

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1100, height: 1000 } });
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));
const errSnapshot = () => consoleErrors.length + pageErrors.length;

const nuke = async () => {
  try {
    const b = page.locator(sel('strength-calibration-bubble'));
    if (await b.isVisible({ timeout: 3000 })) {
      await page.locator(sel('skill-band-intermediate')).click({ timeout: 4000 }).catch(() => {});
      await b.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch {}
  try { const h = page.locator(sel('page-help-modal')); if (await h.isVisible({ timeout: 1000 })) await page.locator(`${sel('page-help-modal')} button`).first().click({ timeout: 2000 }).catch(() => {}); } catch {}
};
const mounted = () => page.locator(sel('coach-game-page')).first().isVisible({ timeout: 3000 }).catch(() => false);
const spam = async (t, n = 6) => { for (let i = 0; i < n; i++) { await page.locator(sel(t)).first().click({ timeout: 800, force: true }).catch(() => {}); } };
const sq = async (s) => page.locator(`[data-square="${s}"]`).first().click({ timeout: 1200, force: true }).catch(() => {});

try {
  // pick-before-load: hammer controls the instant we arrive, before settle
  await page.goto(`${BASE}/coach/home?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.locator(sel('coach-action-play')).click({ timeout: 12000 }).catch(async () => { await nuke(); await page.locator(sel('coach-action-play')).click({ timeout: 8000 }).catch(() => {}); });
  // immediately, before nuke/settle, spam moves + buttons
  let before = errSnapshot();
  await Promise.allSettled([sq('e2'), sq('e4'), spam('hint-button', 4), spam('read-position-btn', 4)]);
  await nuke();
  await page.waitForTimeout(800);
  note('pick-before-load: spam moves+buttons before settle', errSnapshot() > before, `+${errSnapshot() - before} errors`);
  note('survived pick-before-load (still mounted)', !(await mounted()), (await mounted()) ? 'mounted' : 'BLANK');

  // rapid-fire every control
  before = errSnapshot();
  for (const t of ['color-white-btn', 'color-black-btn', 'difficulty-easy', 'difficulty-hard', 'difficulty-medium', 'coach-tips-toggle', 'hint-button', 'read-position-btn']) {
    await spam(t, 6);
  }
  note('rapid-fire all controls 6× each', errSnapshot() > before, `+${errSnapshot() - before} errors`);

  // out-of-order / illegal at the boundaries
  before = errSnapshot();
  await spam('takeback-btn', 5);   // takeback spam
  await spam('restart-btn', 5);    // restart spam
  await spam('nav-first', 4); await spam('nav-prev', 4); await spam('nav-next', 4); await spam('nav-last', 4);
  // illegal moves: pawn 3 squares, knight to nonsense, click same square twice
  await sq('e2'); await sq('e5'); await sq('a1'); await sq('a1'); await sq('h8'); await sq('c3');
  note('out-of-order/illegal at boundaries', errSnapshot() > before, `+${errSnapshot() - before} errors`);

  // mid-action interrupt: move then instantly restart/takeback before coach replies
  before = errSnapshot();
  await sq('e2'); await sq('e4');
  await page.locator(sel('restart-btn')).first().click({ timeout: 600, force: true }).catch(() => {});
  await sq('d2'); await sq('d4');
  await page.locator(sel('takeback-btn')).first().click({ timeout: 600, force: true }).catch(() => {});
  await spam('difficulty-hard', 3); // toggle difficulty mid-think
  await page.waitForTimeout(1500);
  note('mid-action interrupt (move→restart→move→takeback→toggle)', errSnapshot() > before, `+${errSnapshot() - before} errors`);

  // chat double-submit + junk
  before = errSnapshot();
  await page.locator(sel('play-chat-button')).first().click({ timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(700);
  const input = page.locator('textarea, input[type="text"]').first();
  if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
    await input.fill('!@#$%^&*() <script>alert(1)</script> 你好 DROP TABLE; '.repeat(3)).catch(() => {});
    await input.press('Enter').catch(() => {}); await input.press('Enter').catch(() => {}); // double-submit
    await page.waitForTimeout(1500);
  }
  await page.keyboard.press('Escape').catch(() => {});
  note('chat junk + double-submit', errSnapshot() > before, `+${errSnapshot() - before} errors`);

  // resign then try to keep playing
  before = errSnapshot();
  await page.locator(sel('resign-btn')).first().click({ timeout: 2000, force: true }).catch(() => {});
  await page.locator(sel('resign-yes')).first().click({ timeout: 1500, force: true }).catch(() => page.locator(sel('resign-confirm')).first().click({ timeout: 1500, force: true }).catch(() => {}));
  await page.waitForTimeout(1000);
  await sq('e2'); await sq('e4'); // move after resign
  note('resign then move (post-game interaction)', errSnapshot() > before, `+${errSnapshot() - before} errors`);

  await nuke();
  const stillThere = await mounted();
  note('FINAL: surface alive after the assault', !stillThere, stillThere ? 'mounted' : 'BLANK/CRASHED');
} catch (e) {
  note('attack run crashed', true, e.message);
} finally {
  await browser.close();
}

const broke = findings.filter((f) => f.broke);
const dir = `audit-reports/coach-play-attack-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, totalConsoleErrors: consoleErrors.length, totalPageErrors: pageErrors.length, consoleErrors, pageErrors, findings }, null, 2));
console.log(`\nconsole errors: ${consoleErrors.length} | page errors: ${pageErrors.length} | breaks: ${broke.length}`);
if (consoleErrors.length) { console.log('--- console errors (first 6) ---'); consoleErrors.slice(0, 6).forEach((e) => console.log('  ' + e.slice(0, 160))); }
if (pageErrors.length) { console.log('--- page errors ---'); pageErrors.slice(0, 6).forEach((e) => console.log('  ' + e.slice(0, 160))); }
console.log(`report: ${dir}/report.json`);
process.exit(broke.length === 0 ? 0 : 1);
