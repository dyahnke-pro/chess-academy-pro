// Focused interactive audit (David 2026-05-31): asking the coach to teach
// the Pirc middlegame plans must play the chosen plan on the BIG
// /coach/teach board (the one play UI) — NOT the deleted cramped
// MiddlegamePlanInline runner, NOT the legacy walkthrough-mode board.
//
// Runs against localhost:5173 (Vercel 100-build/day cap is blocking
// prod/preview deploys today — localhost is the sanctioned G1 fallback).
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { chromium } from 'playwright';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function dismissOnboarding(page) {
  // Strength-calibration bubble blocks every click on a fresh context.
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown — fine */ }
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ state: 'visible', timeout: 2500 });
    await page.keyboard.press('Escape');
  } catch { /* none */ }
}

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

try {
  await page.goto(`${URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20000 });
  check('coach/teach page mounts', true);

  // Type the exact kind of ask David used.
  const input = page.getByPlaceholder(/Ask your coach/i);
  await input.waitFor({ timeout: 20000 });
  await input.fill('teach me the middle game plans of the pirc');
  await input.press('Enter');

  // Pirc carries multiple authored plans → the picker should appear.
  const picker = page.locator('[data-testid="middlegame-plan-picker"]');
  await picker.waitFor({ state: 'visible', timeout: 20000 });
  const choices = page.locator('[data-testid^="middlegame-plan-choice-"]');
  const n = await choices.count();
  check('Pirc middlegame plan picker appears with choices', n > 0, `${n} plan(s)`);

  // Normal (free-play) control row is present BEFORE we start a plan.
  const takebackBefore = await page.locator('[data-testid="teach-takeback"]').count();
  check('free-play controls present before picking a plan', takebackBefore > 0);

  // Pick the first plan.
  await choices.first().click();

  // The picker must close and the plan must take over the MAIN board:
  //   - picker detaches
  //   - free-play control row (teach-takeback) is replaced by the
  //     walkthrough control panel (so it detaches)
  //   - the big board is still rendered (data-square cells visible)
  await picker.waitFor({ state: 'detached', timeout: 20000 });
  check('plan picker closes after selection', true);

  await page.waitForFunction(
    () => !document.querySelector('[data-testid="teach-takeback"]'),
    { timeout: 20000 },
  );
  check('plan takes over the main board (free-play controls swapped for walkthrough)', true);

  const squares = await page.locator('[data-square]').count();
  check('big board still rendered (data-square cells)', squares >= 32, `${squares} squares`);

  // The deleted cramped runner / legacy board must NOT exist anywhere.
  const inlineRunner = await page.locator('[data-testid="coach-teach-playout"]').count();
  const legacyBoard = await page.locator('[data-testid="walkthrough-mode"]').count();
  check('no legacy MiddlegamePlanInline play-out overlay', inlineRunner === 0);
  check('no legacy walkthrough-mode board', legacyBoard === 0);

  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (err) {
  check('audit completed without throwing', false, String(err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks green`);
process.exit(failed.length === 0 ? 0 : 1);
