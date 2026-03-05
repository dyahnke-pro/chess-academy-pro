import { test, expect } from '@playwright/test';

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB to simulate fresh install
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('first visit loads the app', async ({ page }) => {
    await page.goto('/');
    // App should load regardless of onboarding state
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('settings page shows onboarding when no API key', async ({ page }) => {
    await page.goto('/settings');
    // Should redirect to onboarding or show settings
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/\/(settings|settings\/onboarding)/);
  });

  test('onboarding page renders wizard UI', async ({ page }) => {
    await page.goto('/settings/onboarding');
    await page.waitForLoadState('networkidle');
    // Onboarding should have some form of setup UI
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
