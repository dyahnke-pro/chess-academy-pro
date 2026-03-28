export const config = { runtime: 'edge' };

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400 });
  }

  const upstream = await fetch(`${GITHUB_RELEASE_URL}/${file}`, { redirect: 'follow' });

  if (!upstream.ok) {
    return new Response(`Voice pack not available (${upstream.status}). File may not be uploaded yet.`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': upstream.headers.get('content-length') ?? '',
      'Cache-Control': 'public, max-age=604800, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
