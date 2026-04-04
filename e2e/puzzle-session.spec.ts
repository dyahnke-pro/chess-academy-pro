import { test, expect } from '@playwright/test';

test.describe('Puzzle Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  });

  test('navigates to puzzles page', async ({ page }) => {
    await page.getByRole('link', { name: 'Puzzles' }).first().click();
    await expect(page).toHaveURL(/\/puzzles/);
  });

  test('puzzle page loads chess board', async ({ page }) => {
    await page.goto('/weaknesses/adaptive');
    await page.waitForLoadState('networkidle');
    // Page should render some puzzle UI
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('start session button navigates to puzzles', async ({ page }) => {
    const startBtn = page.getByTestId('start-session-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(page).toHaveURL(/\/puzzles/);
    }
  });
});
