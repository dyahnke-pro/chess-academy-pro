/**
 * ONE MARKETING VERSION (2026-10-21).
 *
 * Xcode Cloud stamps builds with PINNED_MARKETING_VERSION (ci_post_clone.sh).
 * The App Store Connect workflows carried their own '4.0.6' and the scripts
 * fell back to '3.0' / '3.2', so the 4.0.7 hotfix would have been attached to
 * and submitted under the closed 4.0.6 version. Everything reads the pin
 * through scripts/ci/app-version.mjs now; a literal is a second source.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const WORKFLOWS = join(ROOT, '.github/workflows');
const CI = join(ROOT, 'scripts/ci');

const LITERAL_IN_WORKFLOW = /^\s+APP_VERSION:\s*['"]?[0-9]+\.[0-9]/m;
const LITERAL_IN_SCRIPT = /process\.env\.APP_VERSION\s*\|\|\s*['"][0-9]/;

describe('the App Store version has one source', () => {
  it('no workflow hardcodes APP_VERSION', () => {
    const bad = readdirSync(WORKFLOWS)
      .filter((f) => f.endsWith('.yml'))
      .filter((f) => LITERAL_IN_WORKFLOW.test(readFileSync(join(WORKFLOWS, f), 'utf8')));
    expect(bad).toEqual([]);
  });

  it('no CI script falls back to a literal version', () => {
    const bad = readdirSync(CI)
      .filter((f) => f.endsWith('.mjs'))
      .filter((f) => LITERAL_IN_SCRIPT.test(readFileSync(join(CI, f), 'utf8')));
    expect(bad).toEqual([]);
  });

  it('the helper reads the version Xcode Cloud pins', async () => {
    const sh = readFileSync(join(ROOT, 'ios/App/ci_scripts/ci_post_clone.sh'), 'utf8');
    const pinned = sh.match(/^PINNED_MARKETING_VERSION="([^"]+)"/m)?.[1];
    const { pinnedAppVersion } = await import('../../scripts/ci/app-version.mjs');
    expect(pinnedAppVersion()).toBe(pinned);
  });

  it('flags the old shapes (negative control)', () => {
    expect(LITERAL_IN_WORKFLOW.test("        env:\n          APP_VERSION: '4.0.6'\n")).toBe(true);
    expect(LITERAL_IN_SCRIPT.test("const VERSION = process.env.APP_VERSION || '3.2';")).toBe(true);
  });
});
