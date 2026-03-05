import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  });

  test('dashboard loads as home page', async ({ page }) => {
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('navigates to puzzles via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Puzzles' }).first().click();
    await expect(page).toHaveURL(/\/puzzles/);
  });

  test('navigates to openings via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Openings' }).first().click();
    await expect(page).toHaveURL(/\/openings/);
  });

  test('navigates to flashcards via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Flashcards' }).first().click();
    await expect(page).toHaveURL(/\/flashcards/);
  });

  test('navigates to coach via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Coach' }).first().click();
    await expect(page).toHaveURL(/\/coach/);
  });

  test('navigates to games via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Games' }).first().click();
    await expect(page).toHaveURL(/\/games/);
  });

  test('navigates to analysis via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Analysis' }).first().click();
    await expect(page).toHaveURL(/\/analysis/);
  });

  test('navigates to stats via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Stats' }).first().click();
    await expect(page).toHaveURL(/\/stats/);
  });

  test('navigates to settings via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).first().click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('unknown routes redirect to dashboard', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page).toHaveURL('/');
  });

  test('back navigation works after visiting a page', async ({ page }) => {
    await page.getByRole('link', { name: 'Puzzles' }).first().click();
    await expect(page).toHaveURL(/\/puzzles/);
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
