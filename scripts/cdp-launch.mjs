#!/usr/bin/env node
/**
 * cdp-launch.mjs — launch ONE long-lived Chrome with remote debugging so
 * cdp-step.mjs can attach/detach across separate node invocations and let
 * Claude drive the live coach BY HAND, step by step. Stays open until killed.
 *   AUDIT_SANDBOX=1 node scripts/cdp-launch.mjs &
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({
    headless: true,
    executablePath: exe,
    args: [...sandboxLaunchArgs(), '--remote-debugging-port=9222'],
  });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, userAgent: 'AuditCoachPlayBot/1.0 (byhand-cdp)' });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.newPage();
  console.log('[cdp-launch] ready on :9222');
  // keep alive
  await new Promise(() => {});
}
main().catch((e) => { console.error('[cdp-launch] fatal:', e); process.exit(1); });
