// Verify on PROD: the "Black's last move was Kt-e7" page now shows a board WITH
// a knight on e7 (the off-by-one pairing fix). Screens it + reports the e7 cell.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const dir = 'audit-reports/verify-cc-kte7';
mkdirSync(dir, { recursive: true });
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 1000 } });
const page = await ctx.newPage();
const nuke = async () => {
  try { const b = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await b.isVisible({ timeout: 1200 })) { await page.locator('[data-testid="skill-band-intermediate"]').click(); await b.waitFor({ state: 'detached', timeout: 15000 }); } } catch {}
  await page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach((n) => n.remove()));
};
await page.goto(`${BASE}/coach/library?cb=${Date.now()}`, { waitUntil: 'networkidle' });
await nuke(); await page.waitForTimeout(1200); await nuke();
await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 20000 });
await page.locator('[data-testid="library-book-edward-lasker-chess-and-checkers"]').click();
await page.waitForSelector('[data-testid="library-contents"]', { timeout: 6000 }).catch(()=>{});
await page.locator('[data-testid="library-chapter-list"] button').first().click();
await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 }).catch(()=>{});
let found = false;
for (let i = 0; i < 400; i++) {
  const txt = (await page.locator('[data-testid="library-page"]').innerText().catch(()=>'')) || '';
  if (/last move was Kt-e7/i.test(txt) && await page.locator('[data-testid="library-living-board"]').count()) {
    found = true; break;
  }
  const n = page.locator('[data-testid="library-pager"] button').last();
  if (!(await n.isEnabled().catch(()=>false))) break;
  await n.click(); await page.waitForTimeout(40);
}
if (!found) { console.log('DID NOT REACH the Kt-e7 page'); await browser.close(); process.exit(1); }
await page.locator('[data-testid="library-living-board"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
// Probe e7 cell for a piece (react-chessboard puts an img/svg/sprite in the square)
const e7 = await page.evaluate(() => {
  const sq = document.querySelector('[data-testid="library-living-board"] [data-square="e7"]');
  if (!sq) return { present:false };
  const img = sq.querySelector('img');
  const alt = img?.getAttribute('alt') || img?.getAttribute('aria-label') || '';
  let bg = '';
  for (const k of sq.querySelectorAll('*')) { const b = getComputedStyle(k).backgroundImage; if (b && b!=='none') { bg=b; break; } }
  return { present:true, hasImg: !!img, alt, hasBg: !!bg, bgSnippet: bg.slice(0,60) };
});
console.log('Kt-e7 page reached. e7 cell:', JSON.stringify(e7));
await page.locator('[data-testid="library-living-board"]').screenshot({ path: `${dir}/kte7-board.png` });
// also capture the page text shown with it
const head = (await page.locator('[data-testid="library-page"]').innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,120);
console.log('page text:', head);
await browser.close();
console.log('screenshot:', `${dir}/kte7-board.png`);
