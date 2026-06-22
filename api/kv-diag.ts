export const config = { runtime: 'edge' };

/**
 * /api/kv-diag?secret=… — TEMPORARY. Reports whether the KV creds are bound to
 * the Edge runtime and what a real pipeline call returns, so we can see why the
 * usage guard is failing open instead of guessing. Gated by AUDIT_STREAM_SECRET.
 * DELETE once the guard is verified working.
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.AUDIT_STREAM_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const KV_URL = (process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
  const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
  const xff = req.headers.get('x-forwarded-for');
  const ip = (xff ? xff.split(',')[0]!.trim() : req.headers.get('x-real-ip')) ?? 'unknown';
  const win = Math.floor(Date.now() / 1000 / 600);
  const rlKey = `rl:llm:${ip}:${win}`;
  const info: Record<string, unknown> = {
    hasUrl: Boolean(KV_URL),
    hasToken: Boolean(KV_TOKEN),
    urlPrefix: KV_URL.slice(0, 30),
    xForwardedFor: xff,
    computedIp: ip,
    rlKey,
  };
  try {
    // INCR the SAME real rate-limit key the guard uses, so we see whether MY
    // requests accumulate on one key or scatter across many.
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify([['INCR', rlKey], ['EXPIRE', rlKey, 600]]),
    });
    info.status = r.status;
    info.body = (await r.text()).slice(0, 300);
  } catch (e) {
    info.fetchError = String(e);
  }
  return new Response(JSON.stringify(info, null, 1), { status: 200, headers: { 'content-type': 'application/json' } });
}
