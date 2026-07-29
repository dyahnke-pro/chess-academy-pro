import { describe, it, expect, beforeEach } from 'vitest';
import { acquireSwReloadHold, swReloadHoldCount } from './swReloadHold';

describe('swReloadHold', () => {
  beforeEach(() => {
    // Drain any holds a prior test leaked (module state is shared).
    while (swReloadHoldCount() > 0) {
      // Acquire+release pairs can't drain foreign holds — reset via the flag
      // contract instead: releasing is idempotent, so the only way holds
      // remain is a test that never released. Guard against infinite loop.
      break;
    }
    window.__HOLD_SW_RELOAD__ = false;
  });

  it('sets the window flag while held and clears it on release', () => {
    const before = swReloadHoldCount();
    const release = acquireSwReloadHold();
    expect(window.__HOLD_SW_RELOAD__).toBe(true);
    expect(swReloadHoldCount()).toBe(before + 1);
    release();
    expect(swReloadHoldCount()).toBe(before);
    if (before === 0) {
      expect(window.__HOLD_SW_RELOAD__).toBe(false);
    }
  });

  it('ref-counts overlapping holds — flag stays up until the last release', () => {
    const a = acquireSwReloadHold();
    const b = acquireSwReloadHold();
    expect(window.__HOLD_SW_RELOAD__).toBe(true);
    a();
    expect(window.__HOLD_SW_RELOAD__).toBe(true);
    b();
    expect(window.__HOLD_SW_RELOAD__).toBe(false);
  });

  it('double-release is a no-op', () => {
    const a = acquireSwReloadHold();
    const b = acquireSwReloadHold();
    a();
    a(); // second release of the same hold must not decrement again
    expect(window.__HOLD_SW_RELOAD__).toBe(true);
    expect(swReloadHoldCount()).toBe(1);
    b();
    expect(swReloadHoldCount()).toBe(0);
    expect(window.__HOLD_SW_RELOAD__).toBe(false);
  });
});
