/**
 * The ASC workflows must target the version we actually ship.
 *
 * Eleven `.github/workflows/asc-*.yml` files carry a hardcoded
 * `APP_VERSION: '<x.y>'`, and the real marketing version lives in
 * `ios/App/ci_scripts/ci_post_clone.sh`. Nothing kept the two in sync, so a
 * version bump meant remembering to edit twelve places by hand.
 *
 * The failure mode is quiet and expensive: a stale APP_VERSION points the
 * submit / attach / readiness scripts at the version that is ALREADY LIVE on
 * the App Store (David 2026-08-03: live, 21 downloads, 2 paying members). That
 * is how you attach a build to, or submit a review for, the release customers
 * are currently running — instead of the new one. The 2026-08-03 bump to 3.5
 * found all eleven still pinned to 3.4, which was `READY_FOR_SALE`.
 *
 * This test makes the drift impossible to ship.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
const CI_POST_CLONE = 'ios/App/ci_scripts/ci_post_clone.sh';

function shippedMarketingVersion(): string {
  const sh = readFileSync(CI_POST_CLONE, 'utf8');
  const m = sh.match(/^IOS_MARKETING_VERSION="([0-9]+(?:\.[0-9]+)*)"/m);
  if (!m) throw new Error(`Could not find IOS_MARKETING_VERSION in ${CI_POST_CLONE}`);
  return m[1];
}

function workflowsDeclaringAppVersion(): Array<{ file: string; version: string }> {
  return readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .flatMap((f) => {
      const text = readFileSync(join(WORKFLOW_DIR, f), 'utf8');
      // APP_VERSION: '3.5'  /  APP_VERSION: "3.5"  /  APP_VERSION: 3.5
      const matches = [...text.matchAll(/APP_VERSION:\s*['"]?([0-9]+(?:\.[0-9]+)*)['"]?/g)];
      return matches.map((m) => ({ file: f, version: m[1] }));
    });
}

describe('ASC workflows target the version we actually ship', () => {
  it('finds the marketing version in ci_post_clone.sh', () => {
    expect(shippedMarketingVersion()).toMatch(/^[0-9]+(\.[0-9]+)*$/);
  });

  it('every hardcoded APP_VERSION matches IOS_MARKETING_VERSION', () => {
    const shipped = shippedMarketingVersion();
    const declared = workflowsDeclaringAppVersion();
    // Guard the guard: if the workflows stop declaring APP_VERSION this test
    // must not silently pass on an empty set.
    expect(declared.length).toBeGreaterThan(0);

    const drifted = declared.filter((d) => d.version !== shipped);
    expect(
      drifted,
      `these workflows target a different version than ci_post_clone.sh (${shipped}). ` +
        `A stale value points the ASC scripts at the version already live on the App Store:\n` +
        drifted.map((d) => `  ${d.file}: APP_VERSION ${d.version}`).join('\n'),
    ).toEqual([]);
  });
});
