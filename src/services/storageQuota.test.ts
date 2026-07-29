import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { requestPersistentStorage, __resetPersistenceRequestForTests } from './storageQuota';

/**
 * The persistence grant is the 2026-07-29 data-loss fix: without it WebKit
 * evicts IndexedDB from apps that aren't opened often, wiping the profile,
 * progress and imported games of every infrequent tester. These tests pin the
 * contract that matters on a boot path — it must be TOTAL (never throw) and
 * must not re-ask once the grant already exists.
 */

function stubStorage(storage: unknown): void {
  vi.stubGlobal('navigator', { storage } as unknown as Navigator);
}

beforeEach(() => {
  __resetPersistenceRequestForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestPersistentStorage', () => {
  it('reports unsupported when the browser lacks the API', async () => {
    stubStorage({ estimate: vi.fn() });
    expect(await requestPersistentStorage()).toEqual({
      supported: false,
      persisted: false,
      alreadyPersisted: false,
    });
  });

  it('does NOT re-ask when storage is already persistent', async () => {
    const persist = vi.fn();
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist });

    expect(await requestPersistentStorage()).toEqual({
      supported: true,
      persisted: true,
      alreadyPersisted: true,
    });
    // Re-asking can surface a permission prompt on some engines.
    expect(persist).not.toHaveBeenCalled();
  });

  it('requests the grant when not yet persistent, and reports success', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist });

    expect(await requestPersistentStorage()).toEqual({
      supported: true,
      persisted: true,
      alreadyPersisted: false,
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('reports a denied grant without throwing', async () => {
    stubStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    });

    expect(await requestPersistentStorage()).toEqual({
      supported: true,
      persisted: false,
      alreadyPersisted: false,
    });
  });

  it('is total — a throwing implementation degrades to not-persisted', async () => {
    stubStorage({
      persisted: vi.fn().mockRejectedValue(new Error('SecurityError')),
      persist: vi.fn(),
    });

    await expect(requestPersistentStorage()).resolves.toEqual({
      supported: true,
      persisted: false,
      alreadyPersisted: false,
    });
  });

  /**
   * Regression: the first browser audit caught persist() firing TWICE on boot
   * (React StrictMode double-invokes the init effect in dev). A repeat
   * persist() can surface a permission prompt on some engines, so the request
   * is single-flighted for the process.
   */
  it('asks the browser only ONCE even when called repeatedly', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    const persisted = vi.fn().mockResolvedValue(false);
    stubStorage({ persisted, persist });

    await Promise.all([
      requestPersistentStorage(),
      requestPersistentStorage(),
      requestPersistentStorage(),
    ]);
    await requestPersistentStorage();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persisted).toHaveBeenCalledTimes(1);
  });
});
