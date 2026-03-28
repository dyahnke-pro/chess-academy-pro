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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400 });
  }

  try {
    // Step 1: Get the redirect URL from GitHub (don't follow automatically)
    const ghResponse = await fetch(`${GITHUB_RELEASE_URL}/${file}`, {
      redirect: 'manual',
    });

    // GitHub returns 302 with Location header pointing to Azure CDN
    const cdnUrl = ghResponse.headers.get('location');
    if (!cdnUrl) {
      // If no redirect, maybe GitHub returned the file directly (unlikely)
      if (ghResponse.ok && ghResponse.body) {
        return new Response(ghResponse.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': ghResponse.headers.get('content-length') ?? '',
            'Cache-Control': 'public, max-age=604800, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      return new Response(
        `GitHub returned ${ghResponse.status} with no redirect. Headers: ${JSON.stringify(Object.fromEntries(ghResponse.headers.entries()))}`,
        { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Step 2: Fetch from CDN directly (the signed URL)
    const upstream = await fetch(cdnUrl);

    if (!upstream.ok) {
      return new Response(
        `CDN returned ${upstream.status}. URL prefix: ${cdnUrl.substring(0, 80)}...`,
        { status: upstream.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(upstream.body, {
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
