import { test, expect } from '@playwright/test';

/**
 * Traps mode has no dedicated route yet — it lives inside the
 * openings explorer. This smoke asserts we can at least load the
 * openings surface without regression; the feature WO that adds a
 * dedicated traps route will tighten the assertion.
 */
test('traps (openings explorer proxy) loads', async ({ page }) => {
  await page.goto('/openings');
  await expect(page).toHaveURL(/\/openings/);
  await expect(page.locator('body')).toBeVisible();
});
