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

async function plugin(): Promise<typeof import('@aparajita/capacitor-secure-storage').SecureStorage | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return (await import('@aparajita/capacitor-secure-storage')).SecureStorage;
  } catch {
    return null;
  }
}

/** The id stored in the Keychain, or null (web, or nothing stored yet). */
export async function readInstallAnchor(): Promise<string | null> {
  const s = await plugin();
  if (!s) return null;
  try {
    const v = await s.getItem(KEY);
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Store `id` as this install's anchor. Returns whether it was written. */
export async function writeInstallAnchor(id: string): Promise<boolean> {
  const s = await plugin();
  if (!s) return false;
  try {
    await s.setItem(KEY, id);
    return true;
  } catch {
    return false;
  }
}
