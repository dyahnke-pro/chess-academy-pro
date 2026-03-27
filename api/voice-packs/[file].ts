export const config = { runtime: 'edge' };

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400, headers: corsHeaders });
  }

  const ghUrl = `${GITHUB_RELEASE_URL}/${file}`;
  const fetchHeaders: Record<string, string> = {
    'User-Agent': 'ChessAcademyPro/1.0',
  };

  // Forward Range header for chunked downloads
  const rangeHeader = req.headers.get('range');
  if (rangeHeader) {
    fetchHeaders['Range'] = rangeHeader;
  }

  // For HEAD requests, just get the headers
  if (req.method === 'HEAD') {
    const headResp = await fetch(ghUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: fetchHeaders,
    });
    return new Response(null, {
      status: headResp.status,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': headResp.headers.get('content-length') ?? '0',
        'Accept-Ranges': 'bytes',
        ...corsHeaders,
      },
    });
  }

  const upstream = await fetch(ghUrl, {
    redirect: 'follow',
    headers: fetchHeaders,
  });

  if (!upstream.ok) {
    return new Response(`Voice pack not available (${upstream.status})`, {
      status: upstream.status,
      headers: corsHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': upstream.headers.get('content-length') ?? '',
      'Accept-Ranges': 'bytes',
      ...(upstream.headers.get('content-range')
        ? { 'Content-Range': upstream.headers.get('content-range') as string }
        : {}),
      'Cache-Control': 'public, max-age=604800, immutable',
      ...corsHeaders,
    },
  });
}
