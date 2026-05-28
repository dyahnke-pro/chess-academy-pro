import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const page = await browser.newContext(sandboxContextOptions()).then(c => c.newPage());

await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 20000 });
// Dismiss strength-calibration
await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => null);
await page.waitForTimeout(3000);
const bubble = await page.locator('[data-testid="strength-calibration-bubble"]').count();
if (bubble > 0) {
  await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
  await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
}

console.log('waiting 60s for full deferred seed...');
await page.waitForTimeout(60_000);

await page.goto(`${PROD}/openings/pro/naroditsky`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="pro-player-page"]', { timeout: 15000 });
await page.waitForTimeout(6000);

const state = await page.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('ChessAcademyDB');
  req.onsuccess = () => {
    const tx = req.result.transaction(['openings'], 'readonly');
    const all = tx.objectStore('openings').getAll();
    all.onsuccess = () => {
      const naro = all.result.filter((o) => o.proPlayerId === 'naroditsky');
      resolve({ total: all.result.length, naroIds: naro.map((o) => o.id).sort() });
    };
  };
}));
console.log('Dexie:', state.total, 'openings,', state.naroIds.length, 'naroditsky:');
for (const id of state.naroIds) console.log(' ', id);

const cardCount = await page.locator('[data-testid^="opening-card-pro-naroditsky-"]').count();
console.log('cards visible in DOM:', cardCount);

await browser.close();
