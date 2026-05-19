// Shared chromium-path resolver for audit-*.mjs scripts.
//
// In the Claude Code sandbox, `npx playwright install` fails because
// cdn.playwright.dev is not on the allowlist. The sandbox image ships
// Chromium pre-installed under /opt/pw-browsers; this helper finds it
// so scripts can launch the browser without trying to download.
//
// Honors PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH (and legacy
// PLAYWRIGHT_LOCAL_CHROME) overrides. Returns `undefined` when no
// custom path is needed (e.g. a developer machine where Playwright
// installed its own browsers normally) — `chromium.launch()` will then
// fall back to its default lookup.
//
// See docs/sandbox-playwright-setup.md for the wider sandbox runbook.

import { access } from 'node:fs/promises';

/**
 * Sandbox-bypass launch args. The Claude Code sandbox's headless
 * Chromium rejects api.anthropic.com / api.deepseek.com with
 * ERR_CERT_AUTHORITY_INVALID — there's a TLS-MITM somewhere in the
 * sandbox's network path that the sandbox-installed Chromium doesn't
 * trust. `--ignore-certificate-errors` accepts the resigned cert and
 * lets brain calls go through; without it the audits that drive the
 * LLM (audit-coach-teach-interactive, audit-coach-tactic-narration,
 * audit-coach-play's narration scenarios) all see "TypeError: Failed
 * to fetch" and short-circuit.
 *
 * Use:
 *   const browser = await chromium.launch({
 *     headless: true,
 *     executablePath,
 *     args: SANDBOX_CHROMIUM_ARGS,
 *   });
 *   const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ... });
 *
 * Discovered 2026-05-19 — both flag AND ignoreHTTPSErrors on the
 * context are required; either alone leaves the brain blocked.
 */
export const SANDBOX_CHROMIUM_ARGS = [
  '--ignore-certificate-errors',
  '--disable-web-security',
];

const HEADED_CANDIDATES = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
];

const HEADLESS_CANDIDATES = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
];

export async function resolveChromiumExecutable(headed = false) {
  const override =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
    process.env.PLAYWRIGHT_LOCAL_CHROME;
  if (override) {
    try {
      await access(override);
      return override;
    } catch {
      // Fall through to the candidate list.
    }
  }
  const candidates = headed ? HEADED_CANDIDATES : HEADLESS_CANDIDATES;
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      // Try next candidate.
    }
  }
  return undefined;
}
