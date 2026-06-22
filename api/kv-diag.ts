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
  const info: Record<string, unknown> = {
    hasUrl: Boolean(KV_URL),
    hasToken: Boolean(KV_TOKEN),
    urlPrefix: KV_URL.slice(0, 30),
  };
  try {
    const r = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify([['INCR', 'kvdiag:test'], ['EXPIRE', 'kvdiag:test', 60]]),
    });
    info.status = r.status;
    info.body = (await r.text()).slice(0, 300);
  } catch (e) {
    info.fetchError = String(e);
  }
  return new Response(JSON.stringify(info, null, 1), { status: 200, headers: { 'content-type': 'application/json' } });
}
