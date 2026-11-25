/**
 * /api/push-register — the phone files its APNs device token under its install
 * id, so a reply David writes into that device's thread can reach it as a push
 * (api/messages.ts devReply → notifyDevice).
 *
 * POST { device, token, environment: 'production' | 'sandbox', platform: 'ios' }
 * The device id is caller-supplied and proves nothing, the same trust model as
 * the bell's `reply`: it can only file a token for the thread it already reads.
 * Audit traffic never reaches Redis.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuditTraffic } from './_lib/auditTraffic.js';
import { getTokenStore, safeApnsToken, type PushTokenRecord } from './_lib/pushTokens.js';

function safeDevice(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const d = s.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(d) ? d : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-audit-marked');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  if (isAuditTraffic(req.headers)) {
    res.setHeader('x-store', 'refused-audit');
    res.status(200).json({ ok: true, refused: 'audit' });
    return;
  }

  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {};
  const device = safeDevice(body.device);
  const token = safeApnsToken(body.token);
  const environment = body.environment === 'sandbox' ? 'sandbox' : body.environment === 'production' ? 'production' : null;
  if (!device || !token || !environment || body.platform !== 'ios') {
    res.status(400).json({ error: 'device, token, environment and platform:"ios" required' });
    return;
  }

  try {
    const store = await getTokenStore();
    const rec: PushTokenRecord = { token, environment, platform: 'ios', ts: Date.now() };
    await store.set(device, rec);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.setHeader('x-store', 'degraded');
    res.status(200).json({ ok: false, degraded: true, detail: err instanceof Error ? err.message.slice(0, 160) : String(err) });
  }
}
