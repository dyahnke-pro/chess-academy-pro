// One step at a time, against prod, with the profile persisted between runs so
// I can look at what happened and decide the next click myself.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { autoDismissCalibration } from '../audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';

const URL = process.env.URL ?? 'https://chess-academy-pro.vercel.app/coach/teach';
const ACTION = process.argv[2] ?? 'look';
const ARG = process.argv[3] ?? '';

const ctx = await chromium.launchPersistentContext('/tmp/handdrive/profile', {
  headless: true,
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
  ...sandboxContextOptions(),
});
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
const page = ctx.pages()[0] ?? await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

// Every step ensures the page is actually on the surface — a persistent
// context reopens at about:blank, so a step that assumes the last page is
// still there just times out looking for a textarea that was never rendered.
if (!page.url().includes('/coach/')) {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(1500); }
}

if (ACTION === 'open') {
  await page.waitForTimeout(2000);
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count()) { await allow.first().click().catch(() => {}); await page.waitForTimeout(2000); }
} else if (ACTION === 'type') {
  const box = page.locator('textarea').first();
  await box.click();
  await box.pressSequentially(ARG, { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(Number(process.env.WAIT ?? 25000));
} else if (ACTION === 'click') {
  await page.locator(ARG).first().click({ force: true, timeout: 10000 });
  await page.waitForTimeout(Number(process.env.WAIT ?? 8000));
} else if (ACTION === 'wait') {
  await page.waitForTimeout(Number(ARG || 10000));
}

// DUMP WHAT IS ACTUALLY ON SCREEN — buttons I could press, and the last words.
const state = await page.evaluate(() => {
  const txt = (el) => (el.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 90);
  const buttons = [...document.querySelectorAll('button,[role="button"]')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => ({ t: txt(b), id: b.getAttribute('data-testid') }))
    .filter((b) => b.t || b.id);
  const bubbles = [...document.querySelectorAll('[class*="whitespace-pre"],[class*="prose"],p')]
    .filter((e) => e.offsetParent !== null && (e.innerText ?? '').trim().length > 40)
    .map((e) => (e.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 260));
  return { url: location.pathname + location.search, buttons: buttons.slice(0, 26), bubbles: bubbles.slice(-6) };
});
console.log('URL', state.url);
console.log('BUTTONS:'); state.buttons.forEach((b) => console.log(`  [${b.id ?? '-'}] ${b.t}`));
console.log('TEXT:'); state.bubbles.forEach((b) => console.log('  • ' + b));
if (errs.length) console.log('PAGEERRORS:', errs.slice(0, 3));
await ctx.close();
