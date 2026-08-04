/**
 * audit-launch-smoke.mjs — targeted pre-launch audit for the productization work
 * (billing/paywall, legal/support routes, review prompt) + core-surface boot.
 *
 * Runs against a LOCAL dev server by default (the new code lives on a feature
 * branch; Vercel skips branch previews). Verifies the REVIEWER-CRITICAL pages
 * render (Apple/Google reviewers WILL open /privacy, /terms, /support — a 404
 * or crash there is an instant rejection) and that the app boots + navigates
 * clean with all the new code wired in (initBilling, ReviewPrompt mount, etc.).
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-launch-smoke.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// Console/page errors that are real app bugs (ignore noisy non-app sources).
function isAppError(text) {
  if (!text) return false;
  if (/favicon|manifest|sw\.js|workbox|ResizeObserver|Download the React DevTools/i.test(text)) return false;
  if (/net::ERR|Failed to load resource|status of 4\d\d|status of 5\d\d/i.test(text)) return false; // network, not code
  return /Error|Uncaught|TypeError|undefined is not|cannot read|Each child|unique "?key"?|Maximum update depth/i.test(text);
}

async function main() {
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions() });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && isAppError(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  // 1) Reviewer-critical legal + support routes — must render a heading, no crash.
  const legal = [
    { path: '/privacy', expect: /Privacy Policy/i },
    { path: '/terms', expect: /Terms of Service/i },
    { path: '/support', expect: /Support/i },
  ];
  for (const r of legal) {
    const before = errors.length;
    try {
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const h1 = await page.locator('h1').first().textContent({ timeout: 8000 });
      const ok = r.expect.test(h1 || '') && errors.length === before;
      record(`legal route ${r.path}`, ok, ok ? `h1="${h1?.trim()}"` : `h1="${h1?.trim()}" errs=${errors.length - before}`);
    } catch (e) {
      record(`legal route ${r.path}`, false, e.message);
    }
  }

  // Subscription-terms presence on /terms (Apple 3.1.2 EULA must carry sub terms).
  try {
    await page.goto(`${BASE}/terms`, { waitUntil: 'domcontentloaded' });
    // Wait for React to render the Subscriptions section before reading text.
    await page.locator('text=/Subscriptions, free trial, and billing/i').first().waitFor({ timeout: 8000 });
    const body = (await page.locator('body').textContent()) || '';
    const hasSub = /\$7\.99/.test(body) && /\$79\.99/.test(body) && /auto-renew/i.test(body) && /7-day free trial/i.test(body);
    record('terms carries subscription terms ($7.99 + $79.99 + trial + auto-renew)', hasSub);
  } catch (e) {
    record('terms subscription terms', false, e.message);
  }

  // 2) App boots clean with the new code (initBilling + ReviewPrompt mount).
  const beforeBoot = errors.length;
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000); // let init() + billing + analytics settle
    record('app boots clean (no app console/page errors)', errors.length === beforeBoot,
      errors.length === beforeBoot ? '' : errors.slice(beforeBoot).join(' | ').slice(0, 300));
  } catch (e) {
    record('app boots', false, e.message);
  }

  // 3) Core surfaces mount without crashing (no LLM needed for mount).
  const surfaces = ['/openings', '/tactics', '/coach/home', '/weaknesses', '/settings'];
  for (const s of surfaces) {
    const before = errors.length;
    try {
      await page.goto(`${BASE}${s}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2500);
      const crashed = await page.locator('text=/something went wrong/i').count();
      const ok = errors.length === before && crashed === 0;
      record(`surface ${s} mounts`, ok, ok ? '' : (crashed ? 'error-boundary shown' : errors.slice(before).join(' | ').slice(0, 200)));
    } catch (e) {
      record(`surface ${s} mounts`, false, e.message);
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n── launch smoke: ${passed}/${results.length} passed ──`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach((f) => console.log(`  ✗ ${f.name} — ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
