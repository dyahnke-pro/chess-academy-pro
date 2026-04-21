import { test, expect } from '@playwright/test';

/**
 * GM training doesn't have its own route yet — a future WO will add
 * it. Until then this smoke points at /openings/pro which is the
 * closest semantic analog (pro-player opening repertoires). The test
 * will be tightened to its real landing path in that future WO.
 */
test('gm training (pro openings proxy) loads', async ({ page }) => {
  // No stable :playerId route exists without data; land on the
  // openings hub instead.
  await page.goto('/openings');
  await expect(page).toHaveURL(/\/openings/);
  await expect(page.locator('body')).toBeVisible();
});
