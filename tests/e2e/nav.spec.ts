import { test, expect } from '@playwright/test';

/**
 * Smoke-tests each primary nav destination from the dashboard. This
 * is the cheap regression guard against "refactor nav, break a
 * link" — every route in the list must respond and not white-screen.
 */
const primaryRoutes = [
  '/',
  '/openings',
  '/coach/play',
  '/tactics',
  '/tactics/mistakes',
  '/tactics/adaptive',
  '/weaknesses',
  '/games',
  '/settings',
];

for (const route of primaryRoutes) {
  test(`nav: ${route} loads without an error boundary`, async ({ page }) => {
    await page.goto(route);
    // The app's in-house ErrorBoundary exposes this testid when it
    // catches a render failure. If it's visible, the route is broken.
    await expect(page.getByTestId('error-boundary-fallback')).toHaveCount(0);
    // App-level Sentry fallback has a separate testid. Same rule.
    await expect(page.getByTestId('app-error-fallback')).toHaveCount(0);
  });
}
