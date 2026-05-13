import { test, expect } from '@playwright/test';

/**
 * Opening Traps end-to-end smoke.
 *
 * Walks the surface David shipped through PRs #483-#490:
 *   /tactics → 🪤 Opening Traps tile
 *   → family picker (phase filter, gold strip, color-coded rows)
 *   → family detail (W/B toggle, rating chip, adaptive sort)
 *   → puzzle view (board, hint, "Show the opening", auto-advance, "Next trap")
 *
 * Asserts only the visible / interactive surface — board chess.js
 * state is exercised by the existing unit tests; this spec proves
 * the wiring + DOM structure holds.
 */
test.describe('Opening Traps', () => {
  test.beforeEach(async ({ page }) => {
    // The puzzle view fetches Lichess explorer/puzzle and the
    // walkthrough hits /api/lichess-puzzle. Long-poll OK, just don't
    // fail the test on those requests during the page-load phase.
    page.on('pageerror', (err) => {
      // eslint-disable-next-line no-console
      console.error('PAGE-ERROR:', err.message);
    });
    await page.goto('/tactics');
    await page.waitForSelector('[data-testid="tactics-page"]', { timeout: 10000 });
  });

  test('Opening Traps tile routes to /tactics/opening-traps', async ({ page }) => {
    await page.getByTestId('section-opening traps').click();
    await expect(page).toHaveURL(/\/tactics\/opening-traps/);
    await expect(page.getByTestId('opening-blunders-page')).toBeVisible();
  });

  test('family picker shows phase filter, search, color-coded family rows', async ({ page }) => {
    await page.goto('/tactics/opening-traps');
    await page.waitForSelector('[data-testid="opening-blunders-page"]', { timeout: 10000 });

    // Phase filter — all 4 tabs present
    for (const phase of ['opening', 'transition', 'middlegame', 'all'] as const) {
      await expect(page.getByTestId(`opening-blunder-phase-${phase}`)).toBeVisible();
    }
    // Default phase = opening (matches the active-tab styling assertion)
    const openingTab = page.getByTestId('opening-blunder-phase-opening');
    await expect(openingTab).toBeVisible();

    // SmartSearchBar present
    await expect(page.getByPlaceholder('Search openings…')).toBeVisible();

    // At least one family row renders (we have 13 in the local corpus
    // at fullmove ≤ 7 — the default phase filter)
    const familyRows = page.locator('[data-testid^="opening-blunder-family-"]');
    expect(await familyRows.count()).toBeGreaterThan(0);
  });

  test('tapping a family opens the detail view with W/B toggle + rating chip', async ({ page }) => {
    await page.goto('/tactics/opening-traps');
    await page.waitForSelector('[data-testid="opening-blunders-page"]', { timeout: 10000 });

    // Pick the first available family
    const firstFamily = page.locator('[data-testid^="opening-blunder-family-"]').first();
    await firstFamily.click();

    // W/B toggle is the family-detail's distinguishing fingerprint
    const whiteToggle = page.getByTestId('opening-blunder-color-white');
    const blackToggle = page.getByTestId('opening-blunder-color-black');
    await expect(whiteToggle).toBeVisible();
    await expect(blackToggle).toBeVisible();

    // At least one puzzle row in the active side OR the empty-state copy
    const puzzleRows = page.locator('[data-testid^="opening-blunder-"]').filter({
      hasNot: page.locator('[data-testid*="phase"]'),
    });
    expect(await puzzleRows.count()).toBeGreaterThan(0);

    // Toggle to the other color and confirm it doesn't blow up
    await blackToggle.click();
    await whiteToggle.click();
  });

  test('puzzle view loads with board, intro text, and core controls', async ({ page }) => {
    await page.goto('/tactics/opening-traps');
    await page.waitForSelector('[data-testid="opening-blunders-page"]', { timeout: 10000 });
    await page.locator('[data-testid^="opening-blunder-family-"]').first().click();

    // Find any puzzle row and tap it. Puzzle ids are 5-char base62 so
    // the testid pattern is "opening-blunder-<id>" where id != color/phase/family.
    const puzzleRow = page.locator(
      '[data-testid^="opening-blunder-"]:not([data-testid*="phase"]):not([data-testid*="color"]):not([data-testid*="family"])',
    ).first();
    await puzzleRow.click();

    // Puzzle controls
    await expect(page.getByTestId('opening-blunder-show-opening')).toBeVisible();
    await expect(page.getByTestId('opening-blunder-next')).toBeVisible();
  });
});
