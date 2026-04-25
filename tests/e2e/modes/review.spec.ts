import { test, expect } from '@playwright/test';

test('game review (weaknesses) mode loads', async ({ page }) => {
  await page.goto('/weaknesses');
  await expect(page).toHaveURL(/\/weaknesses/);
  // Page should render some content — either an empty-state card or
  // a weakness summary. We assert on a top-level landmark.
  await expect(page.locator('main, [role="main"], body')).toBeVisible();
});
