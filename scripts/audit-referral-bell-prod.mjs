#!/usr/bin/env node
// audit-referral-bell-prod — drives the REAL bell + referral UI on prod, the
// way a human taps it. Written after David's "I don't want another bell mishap"
// (the gray-strip portal bug that unit tests + typecheck passed but shipped
// visually broken). This asserts the panels actually RENDER with real size on
// screen, not just that the DOM node exists.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-referral-bell-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const pass = (n, d = '') => { results.push({ n, ok: true, d }); console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d = '') => { results.push({ n, ok: false, d }); console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`); };

// A panel that renders as a thin strip (the bell mishap) has near-zero width.
// Assert a real, human-usable box.
async function assertRealBox(page, testid, label) {
  const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
  if (!box) { fail(`${label} has a bounding box`, 'no box (not rendered)'); return false; }
  const okW = box.width >= 220, okH = box.height >= 120;
  if (okW && okH) { pass(`${label} renders as a real panel`, `${Math.round(box.width)}×${Math.round(box.height)}`); return true; }
  fail(`${label} renders as a real panel`, `degenerate box ${Math.round(box.width)}×${Math.round(box.height)} (gray-strip class bug)`);
  return false;
}

const errors = [];
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
// Phone viewport — the app is an iOS product; this is what App Store users see,
// and it renders the mobile HEADER bell (the desktop sidebar bell is hidden).
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|manifest|Failed to load resource|net::ERR/.test(t)) errors.push(`console: ${t}`); } });

try {
  console.log(`\n# Referral + bell UI audit @ ${BASE}\n`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Dismiss the AI-consent modal if it gates the shell.
  try { await page.locator('[data-testid="ai-consent-allow"]').click({ timeout: 4000 }); } catch { /* not shown */ }
  await page.waitForTimeout(1500);

  // ── 1. the persistent bell is present + opens ──
  // The visible one at this viewport (mobile header bell).
  const bell = page.locator('[data-testid="notification-bell"]:visible').first();
  if (await bell.count() === 0) { fail('notification bell present'); throw new Error('no visible bell'); }
  pass('notification bell present');
  await bell.click({ force: true });
  await page.locator('[data-testid="notification-panel"]').waitFor({ state: 'visible', timeout: 8000 });
  await assertRealBox(page, 'notification-panel', 'bell panel');

  // ── 2. the "Invite a friend" entry point exists in the bell ──
  const invite = page.locator('[data-testid="notification-invite-friend"]');
  if (await invite.count() === 0) { fail('invite-a-friend button in bell'); }
  else {
    pass('invite-a-friend button in bell');
    await invite.click({ force: true });

    // ── 3. the referral panel RENDERS as a real box (the anti-gray-strip check) ──
    await page.locator('[data-testid="referral-panel"]').waitFor({ state: 'visible', timeout: 8000 });
    const okBox = await assertRealBox(page, 'referral-panel', 'referral panel');

    // ── 4. the code shows (issued by the live API — poll, it's an async fetch) ──
    let codeText = '';
    for (let i = 0; i < 15; i++) {
      codeText = (await page.locator('[data-testid="referral-code"]').textContent().catch(() => ''))?.trim() ?? '';
      if (/^[A-Z0-9]{4,12}$/.test(codeText)) break;
      await page.waitForTimeout(1000);
    }
    if (/^[A-Z0-9]{4,12}$/.test(codeText)) pass('referral code rendered', codeText);
    else fail('referral code rendered', `got "${codeText}" after 15s (API unreachable from browser)`);

    // ── 5. the share + entry controls are visible and usable ──
    const shareVisible = await page.locator('[data-testid="referral-share"]').isVisible().catch(() => false);
    shareVisible ? pass('share button visible') : fail('share button visible');

    // ── 6. redeem flow surfaces an outcome (drive it like a human) ──
    if (okBox) {
      await page.locator('[data-testid="referral-entry"]').fill('ZZZZZZ'); // an unknown code → error outcome
      await page.locator('[data-testid="referral-redeem"]').click();
      try {
        await page.locator('[data-testid="referral-outcome"]').waitFor({ state: 'visible', timeout: 8000 });
        const outcome = (await page.locator('[data-testid="referral-outcome"]').textContent())?.trim() ?? '';
        outcome.length > 0 ? pass('redeem surfaces an outcome', outcome.slice(0, 40)) : fail('redeem surfaces an outcome', 'empty');
      } catch { fail('redeem surfaces an outcome', 'no outcome appeared'); }
    }

    // ── 7. close it ──
    await page.locator('[data-testid="referral-overlay"]').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(500);
    const gone = await page.locator('[data-testid="referral-panel"]').count() === 0;
    gone ? pass('referral panel closes') : fail('referral panel closes');
  }

  if (errors.length === 0) pass('no page/console errors');
  else fail('no page/console errors', errors.slice(0, 5).join(' | '));
} catch (e) {
  fail('audit ran to completion', e.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} green`);
if (errors.length) console.log('errors:\n' + errors.map((e) => '  ' + e).join('\n'));
process.exit(failed.length === 0 ? 0 : 1);
