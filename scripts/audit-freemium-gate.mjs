#!/usr/bin/env node
/**
 * audit-freemium-gate — the metered soft paywall (docs/plans/2026-07-14-freemium-soft-gate.md).
 *
 * TWO layers of verification for this surface:
 *
 *  1. LOGIC (the load-bearing coverage) — pure unit + component tests:
 *       npx vitest run src/services/accessPolicy.test.ts \
 *         src/services/freeTierService.test.ts \
 *         src/components/Paywall/AccessGate.test.tsx \
 *         src/components/Paywall/PaywallPage.test.tsx
 *     These prove the whole allow/wall/meter matrix, the 37-opening free pool,
 *     the 20-puzzle bucket, the one-free-opening claim, and the 7-day kid window.
 *
 *  2. THIS SCRIPT — a live NON-REGRESSION check on web. On the web build the
 *     billing layer is keyless → entitlement resolves `unconfigured` → isPro =
 *     true → the gate is DORMANT, so EVERY route must still render the app
 *     exactly as before (the change must not break today's open web app). This
 *     script drives the real UI and asserts the free-tier routes AND the
 *     would-be-walled routes all render normally on web.
 *
 * ⚠️ THE WALL ITSELF IS NATIVE-ONLY TO EXERCISE. It only engages when
 * `VITE_PAYWALL_ENABLED=true` AND isPro=false — and isPro is only false on a
 * native (iOS/Android) build with a real RevenueCat key and NO active
 * subscription. On web, keyless billing forces isPro=true. So the paywall
 * behavior (open a 2nd opening → wall, spend 20 puzzles → wall, /coach → wall,
 * kid after 7 days → wall) must be verified on a TestFlight build with a
 * StoreKit sandbox account, OR via the unit matrix above. Flagged for David.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-freemium-gate.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';

// Routes that must ALWAYS render the app on web (gate dormant). Includes both
// free-tier routes and would-be-walled routes — on web none should wall.
const ROUTES = [
  { path: '/', label: 'dashboard (free)' },
  { path: '/weaknesses', label: 'weakness tab (free)' },
  { path: '/games/import', label: 'game import (free)' },
  { path: '/tactics', label: 'tactics hub (metered on native)' },
  { path: '/openings/italian-game', label: 'a masterclass opening (free pick on native)' },
  { path: '/openings/kings-gambit', label: 'a gambit opening (walled on native)' },
  { path: '/coach/home', label: 'coach (walled on native)' },
  { path: '/kid', label: 'kid mode (7-day free on native)' },
];

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  const results = [];
  let failures = 0;

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // The paywall renders a distinctive back-to-free link; its ABSENCE means
      // the app (not the wall) is showing — the required web non-regression.
      const walled = await page
        .locator('[data-testid="paywall-back-free"]')
        .isVisible()
        .catch(() => false);
      // Sanity: the app shell (bottom nav or any main content) mounted.
      const appMounted = await page
        .locator('body')
        .evaluate((b) => b.innerText.trim().length > 0)
        .catch(() => false);
      const ok = !walled && appMounted;
      if (!ok) failures++;
      results.push({ ...route, walled, appMounted, ok });
      console.log(`${ok ? '✓' : '✗'} ${route.path.padEnd(26)} ${route.label}${walled ? '  [WALLED — regression!]' : ''}`);
    } catch (err) {
      failures++;
      results.push({ ...route, error: String(err).slice(0, 120), ok: false });
      console.log(`✗ ${route.path.padEnd(26)} ${route.label}  [ERROR ${String(err).slice(0, 80)}]`);
    }
  }

  await browser.close();

  console.log('\n────────────────────────────────────────');
  console.log(`web non-regression: ${results.filter((r) => r.ok).length}/${results.length} routes render the app (gate dormant)`);
  console.log('NOTE: the WALL behavior is native-only — verify on TestFlight with a StoreKit sandbox account (see header).');
  if (failures > 0) {
    console.error(`\n✗ ${failures} route(s) failed the web non-regression check`);
    process.exit(1);
  }
  console.log('\n✓ all routes render normally on web — the soft gate is a safe no-op until it engages on native');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
