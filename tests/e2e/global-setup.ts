import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Playwright global setup — run once before any spec executes.
 *
 * Hits the /auth/test-login route, which creates a local Dexie
 * profile and redirects to /. We then persist browser storage
 * (cookies + IndexedDB + localStorage) to `tests/e2e/.auth/storage.json`
 * so every spec file inherits a "logged in" state via the
 * `use.storageState` config option.
 *
 * NB: we deliberately avoid restoring localStorage manually before
 * navigation — Supabase-style auth libraries clear restored sessions
 * on client-init. Playwright's built-in storageState handles the
 * order correctly (cookies → navigate → storage sync).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const { baseURL, storageState } = config.projects[0].use;
  if (!baseURL) throw new Error('baseURL missing in playwright config');
  if (!storageState || typeof storageState !== 'string') {
    throw new Error('storageState must be a string path');
  }

  mkdirSync(dirname(storageState), { recursive: true });

  const vercelBypassToken = process.env.VERCEL_BYPASS_TOKEN;
  const extraHTTPHeaders = vercelBypassToken
    ? {
        'x-vercel-protection-bypass': vercelBypassToken,
        'x-vercel-set-bypass-cookie': 'true',
      }
    : undefined;

  const browser = await chromium.launch();
  const context = await browser.newContext(
    extraHTTPHeaders ? { extraHTTPHeaders } : {},
  );
  const page = await context.newPage();

  await page.goto(`${baseURL}/auth/test-login`);
  // TestLoginPage redirects to "/" once the local profile is seated.
  await page.waitForURL(`${baseURL}/`, { timeout: 30_000 });

  await context.storageState({ path: storageState });
  await browser.close();
}
