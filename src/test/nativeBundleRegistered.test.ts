/**
 * EVERY NATIVE BUILD REGISTERS THE BUNDLE IT SHIPS WITH OTA (2026-10-21).
 *
 * The OTA endpoint's forward-only guard ranks a phone's current bundle by its
 * entry in the pointer's `history`. A bundle shipped inside an Xcode Cloud
 * build was never published as an OTA, so it had no entry, and the endpoint
 * handed it the older pointer bundle: build 206 (Oct 18) was rolled back to
 * the Oct 11 code on every phone that applied the update.
 *
 * So any workflow that triggers an iOS build must also run
 * register-native-bundle.mjs, after the trigger.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const WORKFLOWS = join(ROOT, '.github/workflows');

function missingRegistration(yml: string): boolean {
  const trigger = yml.indexOf('trigger-ios-build.mjs');
  if (trigger < 0) return false;
  const register = yml.indexOf('register-native-bundle.mjs', trigger);
  return register < 0;
}

describe('native builds register their bundle with OTA', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));

  it('finds the workflows that build iOS', () => {
    const building = files.filter((f) =>
      readFileSync(join(WORKFLOWS, f), 'utf8').includes('trigger-ios-build.mjs'),
    );
    expect(building.length).toBeGreaterThan(0);
  });

  it.each(files)('%s registers after it triggers', (f) => {
    expect(missingRegistration(readFileSync(join(WORKFLOWS, f), 'utf8'))).toBe(false);
  });

  it('flags a workflow that builds without registering (negative control)', () => {
    expect(missingRegistration('run: node scripts/ci/trigger-ios-build.mjs\n')).toBe(true);
    expect(
      missingRegistration(
        'node scripts/ci/register-native-bundle.mjs\nnode scripts/ci/trigger-ios-build.mjs\n',
      ),
    ).toBe(true);
  });
});
