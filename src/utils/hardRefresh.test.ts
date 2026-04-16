import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hardRefresh } from './hardRefresh';

interface MockRegistration {
  unregister: ReturnType<typeof vi.fn>;
}

describe('hardRefresh', () => {
  let reload: ReturnType<typeof vi.fn>;
  let cacheKeys: string[];
  let cacheDelete: ReturnType<typeof vi.fn>;
  let registrations: MockRegistration[];

  beforeEach(() => {
    reload = vi.fn();
    cacheKeys = ['workbox-precache-v2', 'runtime-assets'];
    cacheDelete = vi.fn().mockResolvedValue(true);
    registrations = [
      { unregister: vi.fn().mockResolvedValue(true) },
      { unregister: vi.fn().mockResolvedValue(true) },
    ];

    vi.stubGlobal('caches', {
      keys: vi.fn().mockImplementation(() => Promise.resolve(cacheKeys)),
      delete: cacheDelete,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockImplementation(() => Promise.resolve(registrations)),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Remove the serviceWorker stub we added so other suites aren't affected.
    // Using defineProperty with configurable so delete works.
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it('clears every Cache Storage entry', async () => {
    await hardRefresh({ reload });
    expect(cacheDelete).toHaveBeenCalledTimes(cacheKeys.length);
    for (const key of cacheKeys) {
      expect(cacheDelete).toHaveBeenCalledWith(key);
    }
  });

  it('unregisters every service worker registration', async () => {
    await hardRefresh({ reload });
    for (const reg of registrations) {
      expect(reg.unregister).toHaveBeenCalledTimes(1);
    }
  });

  it('reloads the page after cleanup', async () => {
    await hardRefresh({ reload });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('returns true when every step succeeds', async () => {
    const result = await hardRefresh({ reload });
    expect(result).toBe(true);
  });

  it('still reloads (and returns false) when cache clear fails', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn().mockRejectedValue(new Error('boom')),
      delete: cacheDelete,
    });
    const result = await hardRefresh({ reload });
    expect(result).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads (and returns false) when SW unregister fails', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockRejectedValue(new Error('boom')),
      },
      configurable: true,
    });
    const result = await hardRefresh({ reload });
    expect(result).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for caches when Cache Storage API is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    const result = await hardRefresh({ reload });
    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('skips SW unregister when serviceWorker is unavailable', async () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    const result = await hardRefresh({ reload });
    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
