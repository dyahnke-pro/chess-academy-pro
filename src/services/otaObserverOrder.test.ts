// The OTA listeners must attach BEFORE anything is awaited.
//
// 🚨 WHAT THIS COST (David 2026-09-05, "Fix your shit!! don't guess").
// `autoUpdate: true` makes the plugin check for an update at native launch, so
// `updateAvailable` / `noNeedUpdate` / `downloadComplete` can fire while
// startOtaObserver is still awaiting `current()` and `getBuiltinVersion()`.
// Those events land with no listener attached and are lost forever.
//
// The result was launches showing ONLY `ota_boot`, which I read as "the device
// never checked for an update" and reported to David twice as fact. It was not
// evidence of that — it was this race. An observer whose entire purpose is to
// report what the updater did has to be listening before the updater acts.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'otaObserver.ts'), 'utf8');

/** Body of startOtaObserver, so nothing outside it can satisfy these checks. */
function observerBody(): string {
  const i = SRC.indexOf('export async function startOtaObserver');
  expect(i, 'startOtaObserver is gone').toBeGreaterThan(-1);
  return SRC.slice(i);
}

describe('startOtaObserver ordering', () => {
  const body = observerBody();

  it('attaches every listener before awaiting any plugin read', () => {
    const firstListener = body.indexOf("await add('");
    const currentCall = body.indexOf('CapacitorUpdater.current()');
    const builtinCall = body.indexOf('CapacitorUpdater.getBuiltinVersion()');
    expect(firstListener, 'no listeners attached at all').toBeGreaterThan(-1);
    // Both reads must live inside the deferred snapshot, which runs last.
    const snapshotStart = body.indexOf('const snapshot = async');
    expect(snapshotStart).toBeGreaterThan(-1);
    expect(currentCall).toBeGreaterThan(snapshotStart);
    expect(builtinCall).toBeGreaterThan(snapshotStart);
  });

  it('invokes the snapshot only after the last listener', () => {
    const lastListener = body.lastIndexOf("await add('");
    const snapshotCall = body.indexOf('await snapshot()');
    expect(snapshotCall, 'snapshot never invoked').toBeGreaterThan(-1);
    expect(snapshotCall).toBeGreaterThan(lastListener);
  });

  it('still reports the bundle the device booted', () => {
    // The race fix must not cost us the one per-launch signal.
    expect(body).toContain("'ota_boot'");
    expect(body).toContain('base.running = running');
  });

  it('listens for the events that prove an update was offered and taken', () => {
    for (const ev of ['updateAvailable', 'downloadComplete', 'downloadFailed', 'noNeedUpdate', 'set', 'appReady']) {
      expect(body, `missing listener: ${ev}`).toContain(`await add('${ev}'`);
    }
  });
});
