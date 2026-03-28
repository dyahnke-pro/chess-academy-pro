export const config = { runtime: 'edge' };

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
      },
    });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    // Resolve GitHub redirect to get signed CDN URL
    const ghResponse = await fetch(`${GITHUB_RELEASE_URL}/${file}`, {
      redirect: 'manual',
    });

    const cdnUrl = ghResponse.headers.get('location');
    if (!cdnUrl) {
      return new Response(`GitHub returned ${ghResponse.status} with no redirect`, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Forward Range header if present (for chunked downloads)
    const fetchHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstream = await fetch(cdnUrl, { headers: fetchHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`CDN returned ${upstream.status}`, {
        status: upstream.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': upstream.headers.get('content-length') ?? '',
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(`Edge function error: ${msg}`, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
