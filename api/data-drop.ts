/**
 * /api/data-drop — "Send my data to Claude" (David 2026-10-18: so a question
 * about why the heat map is grey, or what the coach recorded, is answered from
 * the student's own record rather than a screenshot).
 *
 * The app gzips a whitelisted export of its local record (games, slips,
 * capability evidence, mistake puzzles, profile) and POSTs it here. ONE Blob
 * object is written per tap (never per event — a per-event Blob tier once
 * paused the account), under `data-drop/` with a random suffix, and the code
 * that names it goes back to the student to paste into the chat. Reading it
 * needs the project's Blob token; nothing lists or serves it from here.
 *
 * Audit traffic is refused before a byte is stored, and a foreign origin is
 * refused, so neither a bot nor a third-party page can fill the store.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { isAuditTraffic } from './_lib/auditTraffic';
import { isAllowedOrigin } from './_lib/allowedOrigin';

export const config = { api: { bodyParser: false } };

/** Under Vercel's 4.5 MB request cap, with room for headers. */
export const MAX_DROP_BYTES = 4 * 1024 * 1024;

async function readBody(req: VercelRequest, limit: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as unknown as AsyncIterable<Buffer | string>) {
    const b = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += b.length;
    if (size > limit) return null;
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, content-encoding, x-device-id, x-audit-marked');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (isAuditTraffic(req.headers)) { res.status(200).json({ stored: false, refused: 'audit' }); return; }
  const origin = String(req.headers.origin ?? '');
  if (origin && !isAllowedOrigin(origin)) { res.status(403).json({ error: 'forbidden origin' }); return; }
  const body = await readBody(req, MAX_DROP_BYTES);
  if (!body) { res.status(413).json({ error: 'too large' }); return; }
  if (body.length < 20) { res.status(400).json({ error: 'empty' }); return; }
  const gz = String(req.headers['content-encoding'] ?? '') === 'gzip' || (body[0] === 0x1f && body[1] === 0x8b);
  const device = String(req.headers['x-device-id'] ?? 'unknown').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'unknown';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    const blob = await put(`data-drop/${device}-${stamp}${gz ? '.json.gz' : '.json'}`, body, {
      access: 'public',
      addRandomSuffix: true,
      contentType: gz ? 'application/gzip' : 'application/json',
    });
    // The code is the blob's own path: the student pastes it, nothing else.
    res.status(200).json({ stored: true, code: blob.pathname, bytes: body.length });
  } catch (e) {
    res.status(502).json({ error: 'store failed', detail: e instanceof Error ? e.message.slice(0, 120) : 'unknown' });
  }
}
