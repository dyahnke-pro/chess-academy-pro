import { test, expect } from '@playwright/test';

/**
 * Sanity test: when observability is wired, the PostHog reverse-proxy
 * path and Sentry SDK script should be present — or, if disabled by
 * env (preview build without DSN / key), at least the app should not
 * crash while we probe.
 *
 * We don't assert on actual network requests (too brittle cross-env);
 * we assert that:
 *   - The page loads.
 *   - No request goes to a hard-coded 3rd-party analytics domain
 *     (PostHog must be proxied via /ingest).
 */
test('observability: no direct PostHog traffic, only /ingest', async ({ page }) => {
  const directCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/us\.i\.posthog\.com|us-assets\.i\.posthog\.com/.test(url)) {
      directCalls.push(url);
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(directCalls, `unexpected direct PostHog calls: ${directCalls.join(', ')}`).toEqual([]);
});
