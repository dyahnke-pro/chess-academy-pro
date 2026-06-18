// Verify (David 2026-06-18): the inline coach chat is present on the WLPP
// Watch surface — a header Chat button → GameChatPanel drawer on mobile, and a
// persistent chat column on desktop. Same GameChatPanel as Learn/Play w/Coach.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OPENING = process.env.SMOKE_OPENING ?? 'queens-gambit';

async function dismiss(page) {
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.count().catch(() => 0)) {
    await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
    await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count().catch(() => 0)) {
    // Escape often doesn't close it — click its dismiss CTA, then fall back.
    const cta = help.getByRole('button', { name: /got it|close|start|continue|begin|let's go|dismiss/i }).first();
    if (await cta.count().catch(() => 0)) await cta.click().catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await help.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
  }
}

async function openWatch(page) {
  await page.goto(`${BASE}/openings/${OPENING}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  await dismiss(page);
  await page.waitForTimeout(1000);
  const watch = page.getByRole('button', { name: /^watch$/i }).first();
  await watch.waitFor({ state: 'visible', timeout: 20000 });
  await watch.click();
  await page.waitForTimeout(3500);
  await dismiss(page);
}

const main = async () => {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const errors = [];
  let ok = true;

  // ── Mobile: toggle button → drawer ──
  {
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    await openWatch(page);
    const toggle = page.locator('[data-testid="lesson-chat-toggle"]');
    const toggleVisible = await toggle.first().isVisible().catch(() => false);
    console.log(`[mobile] chat toggle button visible: ${toggleVisible ? '✓' : '✗'}`);
    if (!toggleVisible) ok = false;
    let drawer = false, panel = false;
    if (toggleVisible) {
      await toggle.first().click();
      await page.waitForTimeout(800);
      drawer = await page.locator('[data-testid="lesson-chat"]').isVisible().catch(() => false);
      panel = await page.locator('[data-testid="game-chat-panel"]').isVisible().catch(() => false);
    }
    console.log(`[mobile] drawer opens: ${drawer ? '✓' : '✗'}   GameChatPanel mounts: ${panel ? '✓' : '✗'}`);
    if (!drawer || !panel) ok = false;
    await page.screenshot({ path: '/tmp/wlpp-chat-mobile.png' });
    await ctx.close();
  }

  // ── Desktop: persistent chat column, no click needed ──
  {
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    await openWatch(page);
    const col = await page.locator('[data-testid="lesson-chat-column"]').isVisible().catch(() => false);
    const panel = await page.locator('[data-testid="game-chat-panel"]').isVisible().catch(() => false);
    console.log(`[desktop] persistent chat column: ${col ? '✓' : '✗'}   GameChatPanel mounts: ${panel ? '✓' : '✗'}`);
    if (!col || !panel) ok = false;
    await page.screenshot({ path: '/tmp/wlpp-chat-desktop.png' });
    await ctx.close();
  }

  await browser.close();
  const appErrors = errors.filter((e) => !/favicon|manifest|404|net::ERR/i.test(e));
  if (appErrors.length) { console.log(`\n${appErrors.length} console.error(s):`); appErrors.slice(0, 6).forEach((e) => console.log('  -', e)); }
  console.log('\nscreenshots: /tmp/wlpp-chat-mobile.png  /tmp/wlpp-chat-desktop.png');
  console.log(ok ? '\nCHAT VERIFY PASS' : '\nCHAT VERIFY FAIL');
  process.exit(ok ? 0 : 1);
};
main().catch((e) => { console.error('error:', e.message); process.exit(1); });
