import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Sandbox ships chromium-1194 pre-installed but Playwright
        // 1.58 wants 1208's chrome-headless-shell which isn't here
        // and downloads are blocked. Point at the full chrome binary
        // already on disk; falls back to standard download path when
        // PLAYWRIGHT_LOCAL_CHROME isn't set.
        launchOptions: process.env.PLAYWRIGHT_LOCAL_CHROME
          ? { executablePath: process.env.PLAYWRIGHT_LOCAL_CHROME }
          : undefined,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
