/**
 * dataDrop — "Send my data to Claude" (David 2026-10-18).
 *
 * Exports the student's own record — games with their analysis, every slip
 * the coach filed, every capability answer, the mistake puzzles, the profile —
 * gzips it on the device and sends it to `/api/data-drop`, which stores ONE
 * object and hands back a code to paste into the chat. Only on a tap; nothing
 * here runs on its own.
 */
import { db } from '../db/schema';
import { getDeviceId } from './deviceIdentity';
import { withWebOrigin } from '../utils/webOrigin';
import { getBuildId } from './appAuditor';

/** The stores that ARE the student's record. The narration and opening caches
 *  are left out: they are rebuilt from the app's own data, and they are large. */
export const DROP_STORES = ['games', 'misconceptionTags', 'capabilityEvidence', 'mistakePuzzles', 'profiles', 'meta'] as const;

export interface DropResult { ok: boolean; code?: string; bytes?: number; error?: string }

/** A field that may hold a credential never leaves the device: the profile
 *  carries the audit-stream secret in its preferences, and meta rows can hold
 *  keys. Redacted by NAME, at any depth, before anything is serialised. */
const SECRET_NAME = /secret|token|api[-_]?key|password|credential/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // A meta row is { key, value }: its NAME is in `key`.
    if (k === 'value' && typeof (value as { key?: unknown }).key === 'string' && SECRET_NAME.test((value as { key: string }).key)) { out[k] = '[redacted]'; continue; }
    out[k] = SECRET_NAME.test(k) ? '[redacted]' : redactSecrets(v);
  }
  return out;
}

export async function buildDropPayload(): Promise<Record<string, unknown>> {
  const stores: Record<string, unknown[]> = {};
  for (const name of DROP_STORES) {
    try { stores[name] = (await db.table(name).toArray()).map(redactSecrets); } catch { stores[name] = []; }
  }
  return { exportedAt: new Date().toISOString(), build: getBuildId(), stores };
}

async function gzip(text: string): Promise<{ body: Blob; gz: boolean }> {
  const raw = { body: new Blob([text], { type: 'application/json' }), gz: false };
  if (typeof CompressionStream === 'undefined') return raw;
  try {
    const source = new Response(text).body;
    if (!source) return raw;
    return { body: await new Response(source.pipeThrough(new CompressionStream('gzip'))).blob(), gz: true };
  } catch { return raw; }
}

/** Whether this device may send its data — the server's answer, from the
 *  owner list (`OWNER_DEVICE_IDS`). Any failure is "no": the panel stays hidden. */
export async function canSendMyData(): Promise<boolean> {
  try {
    const resp = await fetch(withWebOrigin('/api/data-drop'), {
      method: 'GET',
      headers: { 'x-device-id': await getDeviceId().catch(() => '') },
    });
    if (!resp.ok) return false;
    return ((await resp.json()) as { owner?: boolean }).owner === true;
  } catch { return false; }
}

export async function sendMyData(): Promise<DropResult> {
  try {
    const payload = await buildDropPayload();
    const { body, gz } = await gzip(JSON.stringify(payload));
    const resp = await fetch(withWebOrigin('/api/data-drop'), {
      method: 'POST',
      headers: {
        'content-type': gz ? 'application/gzip' : 'application/json',
        ...(gz ? { 'content-encoding': 'gzip' } : {}),
        'x-device-id': await getDeviceId().catch(() => 'unknown'),
      },
      body,
    });
    const json = (await resp.json().catch(() => ({}))) as { stored?: boolean; code?: string; bytes?: number; error?: string };
    if (!resp.ok || !json.stored || !json.code) return { ok: false, error: json.error ?? `HTTP ${resp.status}` };
    return { ok: true, code: json.code, bytes: json.bytes };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}
