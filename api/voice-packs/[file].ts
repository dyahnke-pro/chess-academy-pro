export const config = { runtime: 'edge' };

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      },
    });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  try {
    // Resolve GitHub redirect to get the signed CDN URL
    const ghResponse = await fetch(`${GITHUB_RELEASE_URL}/${file}`, {
      redirect: 'manual',
    });

    const cdnUrl = ghResponse.headers.get('location');
    if (!cdnUrl) {
      return new Response(`GitHub returned ${ghResponse.status} with no redirect`, {
        status: 502,
        headers: corsHeaders,
      });
    }

    // Forward Range header from client if present (for chunked downloads)
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstream = await fetch(cdnUrl, { headers: fetchHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`CDN returned ${upstream.status}`, {
        status: upstream.status,
        headers: corsHeaders,
      });
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=604800, immutable',
      'Accept-Ranges': 'bytes',
      ...corsHeaders,
    };

    const cl = upstream.headers.get('content-length');
    if (cl) responseHeaders['Content-Length'] = cl;

    const cr = upstream.headers.get('content-range');
    if (cr) responseHeaders['Content-Range'] = cr;

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(`Edge function error: ${msg}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
