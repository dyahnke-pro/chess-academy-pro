import { test, expect } from '@playwright/test';

test('practice mode loads and offers a primary action', async ({ page }) => {
  await page.goto('/coach/train');
  await expect(page).toHaveURL(/\/coach\/train/);
  // The page may render either a practice position board or a setup
  // card — either is acceptable as "mode loaded". We just need one
  // reachable interactive surface before considering the smoke test
  // green.
  const interactive = page.locator('button, a[href]').first();
  await expect(interactive).toBeVisible({ timeout: 15_000 });
});
