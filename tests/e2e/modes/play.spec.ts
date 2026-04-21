import { test, expect } from '@playwright/test';

test('play-against-coach mode loads a board', async ({ page }) => {
  await page.goto('/coach/play');
  await expect(page).toHaveURL(/\/coach\/play/);
  const board = page.locator('[data-testid*="board"]').first();
  await expect(board).toBeVisible({ timeout: 20_000 });
});
