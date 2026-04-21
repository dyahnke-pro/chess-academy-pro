import { test, expect } from '@playwright/test';

test('pawns journey map loads', async ({ page }) => {
  await page.goto('/kid/journey');
  await expect(page).toHaveURL(/\/kid\/journey/);
  await expect(page.locator('body')).toBeVisible();
});
