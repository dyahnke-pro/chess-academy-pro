import { test, expect } from '@playwright/test';

test('tactics hub renders the drill entry points', async ({ page }) => {
  await page.goto('/tactics');
  await expect(page).toHaveURL(/\/tactics/);
  // At minimum the landing grid should offer an adaptive / classic /
  // mistakes entry; asserting on visible text keeps the assertion
  // resilient to layout tweaks.
  const body = page.locator('body');
  await expect(body).toContainText(/adaptive|classic|mistakes/i);
});
