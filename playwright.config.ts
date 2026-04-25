import { defineConfig, devices } from '@playwright/test';

// PLAYWRIGHT_BASE_URL is set by the CI workflow from the Vercel
// Preview deployment URL. Falls back to the local dev server so
// developers can run `npm run test:e2e` without touching env vars.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const useLocalServer = baseURL.startsWith('http://localhost');

// Vercel Deployment Protection bypass. When the secret is configured,
// every Playwright request carries the bypass header + cookie flag so
// preview deploys behind SSO don't 401. Unset locally = no-op.
const vercelBypassToken = process.env.VERCEL_BYPASS_TOKEN;
const extraHTTPHeaders = vercelBypassToken
  ? {
      'x-vercel-protection-bypass': vercelBypassToken,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: 'tests/e2e/.auth/storage.json',
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start a local dev server when running against localhost.
  // Against a Vercel Preview URL we trust the workflow to have waited
  // for readiness before invoking playwright.
  webServer: useLocalServer
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
