// Phone simulator — boots the app in a Chromium iPhone viewport, dismisses
// the first-run gates, drives whatever routes you name, and drops PNGs.
//
// There is no iOS simulator in the Linux container, so this is the stand-in:
// the real app, at real phone dimensions, driven the way a tester would.
//
//   SIM_URL=http://localhost:5173 node scripts/simulator.mjs
//   SIM_ROUTES=/,/coach,/openings node scripts/simulator.mjs
//   SIM_DEVICE="iPhone 15 Pro" SIM_OUT=audit-reports/sim node scripts/simulator.mjs
//
// Against prod, add AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY (see CLAUDE.md §G1).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const URL = process.env.SIM_URL || process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const DEVICE = process.env.SIM_DEVICE || 'iPhone 15';
const OUT = process.env.SIM_OUT || path.join('audit-reports', 'simulator');
const ROUTES = (process.env.SIM_ROUTES || '/,/coach,/openings,/tactics,/kid')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const log = (...args) => console.log('[sim]', ...args);

/** Clear the first-run gates so clicks land instead of hitting an overlay. */
async function dismissFirstRunGates(page) {
  // The gates mount asynchronously and can stack (consent over calibration over
  // page-help), so wait for each rather than probing once, and sweep twice.
  for (let pass = 0; pass < 2; pass += 1) {
    const consent = page.locator('[data-testid="ai-consent-allow"]');
    try {
      await consent.waitFor({ state: 'visible', timeout: pass === 0 ? 8000 : 1500 });
      await consent.click();
      await consent.waitFor({ state: 'detached', timeout: 10000 });
      log('accepted ai-consent modal');
    } catch {
      /* already consented in this context */
    }

    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    try {
      await bubble.waitFor({ state: 'visible', timeout: pass === 0 ? 8000 : 1500 });
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
      log('dismissed strength-calibration bubble');
    } catch {
      /* already calibrated in this context */
    }

    await dismissHelpModal(page);
  }
}

async function dismissHelpModal(page) {
  const modal = page.locator('[data-testid="page-help-modal"]');
  if (!(await modal.isVisible().catch(() => false))) return;
  const close = modal.locator('button').last();
  await close.click().catch(() => {});
  await modal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  log('dismissed page-help modal');
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext({
    ...devices[DEVICE],
    ...sandboxContextOptions(),
  });

  const consoleErrors = [];
  const pageErrors = [];
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));

  const shots = [];
  for (const route of ROUTES) {
    const target = `${URL.replace(/\/$/, '')}${route}`;
    log(`→ ${target}`);
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await dismissFirstRunGates(page);
      await page.waitForTimeout(2500);
      const file = path.join(OUT, `${route === '/' ? 'home' : route.replace(/^\/|\//g, '-').replace(/^-/, '')}.png`);
      await page.screenshot({ path: file, fullPage: false });
      shots.push({ route, file, title: await page.title() });
      log(`  shot → ${file}`);
    } catch (err) {
      log(`  FAILED ${route}: ${err.message}`);
      shots.push({ route, error: err.message });
    }
  }

  const report = { url: URL, device: DEVICE, shots, consoleErrors, pageErrors };
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  await browser.close();
  log(`${shots.filter((s) => s.file).length}/${ROUTES.length} routes captured`);
  if (pageErrors.length) log(`pageerrors: ${pageErrors.length}`);
  if (consoleErrors.length) log(`console errors: ${consoleErrors.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
