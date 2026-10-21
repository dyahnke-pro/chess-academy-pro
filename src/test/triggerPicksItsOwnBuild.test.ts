/**
 * THE iOS TRIGGER WAITS ON THE BUILD ITS OWN RUN PRODUCED (2026-10-21).
 *
 * `trigger-ios-build.mjs` used `/v1/builds?sort=-version&limit=1`, which sorts
 * version STRINGS — an old epoch-numbered build ("1782017440") always came
 * first, so "wait for VALID" reported READY on a stale build without waiting.
 * Distribution then took "the newest VALID upload", which during processing is
 * the PREVIOUS build: 206, the one that crashed at launch on iOS 27.
 *
 * Now the trigger reads `/v1/ciBuildRuns/{run}/builds` and exports that build's
 * id as TF_BUILD_ID, which distribute-testflight.mjs already honours.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

function picksOwnBuild(raw: string): boolean {
  const src = raw
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
  return (
    /\/v1\/ciBuildRuns\/\$\{runId\}\/builds/.test(src) &&
    /TF_BUILD_ID=/.test(src) &&
    !/\/v1\/builds\?[^`]*sort=-version/.test(src)
  );
}

describe('the iOS trigger picks its own build', () => {
  it('trigger-ios-build waits on the run\'s build and exports its id', () => {
    expect(picksOwnBuild(read('scripts/ci/trigger-ios-build.mjs'))).toBe(true);
  });

  it('distribute-testflight honours TF_BUILD_ID before any "latest VALID" lookup', () => {
    const src = read('scripts/ci/distribute-testflight.mjs');
    expect(src.indexOf('process.env.TF_BUILD_ID')).toBeGreaterThan(-1);
    expect(src.indexOf('process.env.TF_BUILD_ID')).toBeLessThan(src.indexOf('sort=-uploadedDate'));
  });

  it('flags the old lookup (negative control)', () => {
    const old = "const builds = await api('GET', `/v1/builds?filter[app]=${APP}&limit=1&sort=-version&fields[builds]=version,processingState`);";
    expect(picksOwnBuild(old)).toBe(false);
  });
});
