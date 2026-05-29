// Localhost smoke for the unified opening Watch/Learn chrome (LessonScaffold).
// Prod deploy is blocked by the Vercel 100/day cap, so this runs against the
// local dev server as the sanctioned fallback (CLAUDE.md G1). It drives an
// opening detail page, opens a Watch view, and asserts the unified scaffold:
// progress bar + visible narration card + prev/play-pause/next controls.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OPENING = process.env.SMOKE_OPENING ?? 'vienna-game';

async function dismiss(page) {
  // Strength-calibration onboarding bubble blocks fresh-context clicks.
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.count().catch(() => 0)) {
    await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
    await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count().catch(() => 0)) {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

const main = async () => {
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const page = await (await browser.newContext(sandboxContextOptions())).newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 200)); });

  console.log(`→ ${BASE}/openings/${OPENING}`);
  await page.goto(`${BASE}/openings/${OPENING}`, { waitUntil: 'domcontentloaded' });
  // Let the deferred seed + opening detail mount.
  await page.waitForTimeout(8000);
  await dismiss(page);
  await page.waitForTimeout(1000);

  // Find any Watch button on the page (main line ladder or a section card).
  const watch = page.getByRole('button', { name: /^watch$/i }).first();
  await watch.waitFor({ state: 'visible', timeout: 20000 });
  await watch.click();
  await page.waitForTimeout(4000);
  await dismiss(page);

  // Assert the unified scaffold pieces.
  const results = {};
  for (const [label, sel] of [
    ['progress bar', '[data-testid="lesson-progress"], [data-testid="demo-progress"], [data-testid="walkthrough-progress"]'],
    ['narration card', '[data-testid="lesson-narration"], [data-testid="demo-annotation"]'],
    ['prev button', '[data-testid="lesson-prev"], [data-testid="model-game-prev"]'],
    ['play/pause', '[data-testid="lesson-play-pause"], [data-testid="demo-play-pause"]'],
    ['next button', '[data-testid="lesson-next"], [data-testid="model-game-next"]'],
    ['back button', '[data-testid="lesson-back"], [data-testid="line-player-back"]'],
  ]) {
    results[label] = await page.locator(sel).first().isVisible().catch(() => false);
  }

  const narrationText = (await page.locator('[data-testid="lesson-narration"], [data-testid="demo-annotation"]').first().textContent().catch(() => '') ?? '').trim();

  await page.screenshot({ path: '/tmp/opening-watch-scaffold.png', fullPage: false });

  console.log('\n── unified Watch scaffold ──');
  for (const [k, v] of Object.entries(results)) console.log(`  ${v ? '✓' : '✗'} ${k}`);
  console.log(`  narration: "${narrationText.slice(0, 90)}${narrationText.length > 90 ? '…' : ''}"`);
  console.log('  screenshot: /tmp/opening-watch-scaffold.png');

  const allGreen = Object.values(results).every(Boolean) && narrationText.length > 0;
  await browser.close();
  console.log(allGreen ? '\nSMOKE PASS' : '\nSMOKE INCOMPLETE');
  process.exit(allGreen ? 0 : 1);
};

main().catch((e) => { console.error('smoke error:', e.message); process.exit(1); });
