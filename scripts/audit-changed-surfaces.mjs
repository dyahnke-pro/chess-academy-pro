// Targeted mount check for the surfaces changed in the tactical-sequences-display
// work (scroll fixes, Talk buttons, sequence extension). Dismisses the
// onboarding bubble first (per G1), navigates each changed route, and asserts it
// mounts with no pageerror. Not a full behavioral audit — a render/no-crash gate
// for exactly the files this branch touched, since the hub-scenario audits trip
// on cold-context onboarding on surfaces we didn't change.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const TARGETS = [
  { route: '/tactics/weakness-themes', testid: 'weakness-themes-page', label: 'My Weaknesses (scroll fix)' },
  { route: '/tactics/create', testid: 'back-btn', label: 'Tactic Create (scroll fix)' },
  { route: '/coach/home', testid: 'coach-home-page', label: 'Coach hub' },
  { route: '/coach/home', testid: 'coach-talk-btn', label: 'Coach hub — Talk button' },
];

const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(autoDismissCalibration);

const results = [];
for (const t of TARGETS) {
  const page = await ctx.newPage();
  const pageerrors = [];
  page.on('pageerror', (e) => pageerrors.push(String(e)));
  let ok = false, note = '';
  try {
    await page.goto(`${BASE}${t.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator(`[data-testid="${t.testid}"]`).first().waitFor({ state: 'visible', timeout: 20000 });
    ok = pageerrors.length === 0;
    note = pageerrors.length ? `pageerror: ${pageerrors[0].slice(0, 120)}` : 'mounted, no pageerror';
  } catch (e) {
    note = `FAIL: ${String(e).split('\n')[0].slice(0, 140)}`;
  }
  results.push({ ...t, ok, note });
  console.log(`${ok ? '✓' : '✗'} ${t.label} (${t.route} → ${t.testid}) — ${note}`);
  await page.close();
}

// Bonus: click the Talk button and confirm it opens the drawer (store-driven).
try {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/coach/home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="coach-talk-btn"]').first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('[data-testid="coach-talk-btn"]').first().click({ force: true });
  const opened = await page.locator('[data-testid="global-coach-drawer"], [data-testid="close-coach-drawer"]').first()
    .waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  console.log(`${opened ? '✓' : '✗'} Talk button opens the coach drawer — ${opened ? 'drawer visible' : 'drawer not found'}`);
  results.push({ label: 'Talk opens drawer', ok: opened });
  await page.close();
} catch (e) {
  console.log(`✗ Talk-opens-drawer threw: ${String(e).split('\n')[0]}`);
  results.push({ label: 'Talk opens drawer', ok: false });
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\nchanged-surfaces: ${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
