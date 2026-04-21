import { test, expect } from '@playwright/test';

/**
 * Nudge system ships dormant: ff_nudge_system_enabled defaults OFF
 * everywhere. At-ship this test verifies the core wiring:
 *   - Toaster is mounted at the root.
 *   - No nudge fires without the flag.
 * The full "flag ON → toast → dismissal" path exercises once the
 * flag is flipped in the PostHog dashboard; that acceptance is
 * asserted manually during prod smoke test.
 */
test('nudge: Toaster is mounted and no toast fires at flag-off ship state', async ({ page }) => {
  await page.goto('/');
  // sonner renders a host <ol> with role="region" aria-label containing
  // "Notifications" once mounted.
  const region = page.locator('[role="region"][aria-label*="otification"]').first();
  await expect(region).toBeAttached();

  // No toasts should be visible at dormant ship state.
  const toasts = page.locator('[data-sonner-toast]');
  await expect(toasts).toHaveCount(0);
});
