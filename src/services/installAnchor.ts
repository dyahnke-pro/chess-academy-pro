/**
 * installAnchor — the one id that survives a delete-and-reinstall (David
 * 2026-10-18: "What's preventing someone from deleting and reinstalling for
 * more free openings?").
 *
 * Everything else the app stores — the database, RevenueCat's anonymous id —
 * lives in the app's own container, which iOS deletes with the app. The iOS
 * KEYCHAIN does not: an item written there is still readable after the app is
 * reinstalled. So the install id is kept there, on this device only (never
 * iCloud-synced, so two phones stay two installs).
 *
 * Native only. On the web there is no keychain and nothing to protect (the web
 * app is free), so this returns null and every caller falls back as before.
 */
import { Capacitor } from '@capacitor/core';

const KEY = 'install-anchor';

type SecureStorage = typeof import('@aparajita/capacitor-secure-storage').SecureStorage;

/**
 * The plugin, BOXED. It is a Capacitor proxy that answers every property —
 * `then` included — with a native-method wrapper, so it must never be the
 * value an async function returns: the promise machinery then calls
 * `proxy.then(resolve, reject)`, the wrapper rejects with
 * `"SecureStorage.then()" is not implemented on ios` and never calls either,
 * and the read hangs forever (2026-10-22 native build: every device id lookup
 * on iOS waited on it, and with it billing, the free-tier ledger and the bell).
 */
async function plugin(): Promise<{ s: SecureStorage } | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return { s: (await import('@aparajita/capacitor-secure-storage')).SecureStorage };
  } catch {
    return null;
  }
}

/** The id stored in the Keychain, or null (web, or nothing stored yet). */
export async function readInstallAnchor(): Promise<string | null> {
  const p = await plugin();
  if (!p) return null;
  try {
    const v = await p.s.getItem(KEY);
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Store `id` as this install's anchor. Returns whether it was written. */
export async function writeInstallAnchor(id: string): Promise<boolean> {
  const p = await plugin();
  if (!p) return false;
  try {
    await p.s.setItem(KEY, id);
    return true;
  } catch {
    return false;
  }
}
