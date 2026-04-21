/**
 * dismissals.ts — read/write the user_dismissals Supabase table.
 *
 * The source of truth for "has the user dismissed this nudge / pin /
 * changelog entry" is the Supabase row. The Zustand `dismissals` Set
 * is a cache populated on login; all writes go through here so local
 * and remote stay in lock-step.
 *
 * Offline behavior: when the user has no Supabase session, writes are
 * applied to the local Zustand cache only. The nudge engine is gated
 * such that anonymous users never see a nudge in the first place, so
 * "forgetting" a dismissal across reloads is a non-issue.
 */

import { useAppStore } from '../stores/appStore';
import { captureException } from './sentry';
import { getSyncConfig } from './syncService';

async function supabaseRequest(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<Response | null> {
  const profile = useAppStore.getState().activeProfile;
  if (!profile) return null;
  const config = await getSyncConfig(profile);
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.syncUserId) {
    return null;
  }
  const url = `${config.supabaseUrl}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    ...(init.headers ?? {}),
  };
  return fetch(url, { ...init, headers });
}

/**
 * Pull the current user's dismissed keys from Supabase into the
 * Zustand cache. Safe to call on every login — the table is tiny.
 */
export async function hydrateDismissals(): Promise<void> {
  try {
    const res = await supabaseRequest(
      'user_dismissals?select=key',
      { method: 'GET' },
    );
    if (!res || !res.ok) return;
    const rows = (await res.json()) as Array<{ key: string }>;
    const keys = rows.map((r) => r.key);
    useAppStore.getState().setDismissals(keys);
  } catch (err) {
    captureException(err, { subsystem: 'supabase', tag: 'hydrateDismissals' });
  }
}

/**
 * Optimistically mark a key as dismissed locally and push the row to
 * Supabase. A network failure leaves the local flag set — next login
 * will reconcile from the authoritative server state.
 */
export async function recordDismissal(key: string): Promise<void> {
  useAppStore.getState().addDismissal(key);
  try {
    await supabaseRequest('user_dismissals', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key }),
    });
  } catch (err) {
    captureException(err, { subsystem: 'supabase', tag: 'recordDismissal' });
  }
}
