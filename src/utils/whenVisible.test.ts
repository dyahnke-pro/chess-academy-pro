import { describe, it, expect, afterEach } from 'vitest';
import { whenVisible } from './whenVisible';

function setVisibility(v: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('whenVisible', () => {
  afterEach(() => setVisibility('visible'));

  it('resolves at once on a visible page', async () => {
    await expect(whenVisible()).resolves.toBeUndefined();
  });

  it('waits on a hidden page until it is visible again', async () => {
    setVisibility('hidden');
    let done = false;
    const p = whenVisible().then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    setVisibility('visible');
    await p;
    expect(done).toBe(true);
  });
});
