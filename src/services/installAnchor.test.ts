import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The Keychain plugin is a Capacitor PROXY: every property it is asked for —
 * `then` included — comes back as a method wrapper that calls the native side
 * and rejects with "not implemented" when no such method exists. Returning
 * that proxy from an async function makes the promise machinery treat it as a
 * thenable and call `proxy.then(resolve, reject)`, which never calls either:
 * the read hung forever and the rejection surfaced as the unhandled
 * `"SecureStorage.then()" is not implemented on ios` (32 a day on David's
 * phone, from the 2026-10-22 native build). Everything that waits on the
 * device id — billing, the free-tier ledger, the bell — waited with it.
 */
const store = new Map<string, string>();
const capacitorShapedProxy = new Proxy({}, {
  get(_target, prop: string | symbol) {
    if (prop === 'getItem') return async (k: string): Promise<string | null> => store.get(k) ?? null;
    if (prop === 'setItem') return async (k: string, v: string): Promise<void> => { store.set(k, v); };
    // Capacitor's createPluginMethodWrapper: ignores its arguments, rejects.
    return (): Promise<never> => Promise.reject(new Error(`"SecureStorage.${String(prop)}()" is not implemented on ios`));
  },
});

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: (): boolean => true } }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({ SecureStorage: capacitorShapedProxy }));

const within = <T>(p: Promise<T>, ms = 500): Promise<T | 'hung'> =>
  Promise.race([p, new Promise<'hung'>((r) => setTimeout(() => r('hung'), ms))]);

describe('installAnchor — the Keychain plugin is a Capacitor proxy', () => {
  beforeEach(() => store.clear());

  it('reads the stored anchor instead of hanging on the proxy', async () => {
    store.set('install-anchor', 'anchor-123');
    const { readInstallAnchor } = await import('./installAnchor');
    expect(await within(readInstallAnchor())).toBe('anchor-123');
  });

  it('writes the anchor instead of hanging on the proxy', async () => {
    const { writeInstallAnchor } = await import('./installAnchor');
    expect(await within(writeInstallAnchor('fresh-id'))).toBe(true);
    expect(store.get('install-anchor')).toBe('fresh-id');
  });

  it('reads null when nothing is stored', async () => {
    const { readInstallAnchor } = await import('./installAnchor');
    expect(await within(readInstallAnchor())).toBeNull();
  });
});
