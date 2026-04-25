import { test, expect } from '@playwright/test';

test('my mistakes mode loads', async ({ page }) => {
  await page.goto('/tactics/mistakes');
  await expect(page).toHaveURL(/\/tactics\/mistakes/);
  // Either an empty state ("No mistakes yet") or the review board.
  await expect(page.locator('body')).toContainText(/mistake/i);
});
