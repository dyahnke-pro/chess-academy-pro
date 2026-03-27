export const config = { runtime: 'edge' };

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400 });
  }

  // Step 1: Get the redirect URL from GitHub (don't auto-follow)
  const ghResponse = await fetch(`${GITHUB_RELEASE_URL}/${file}`, { redirect: 'manual' });

  const redirectUrl = ghResponse.headers.get('location');
  if (!redirectUrl) {
    return new Response('Voice pack not found or not yet uploaded.', { status: 404 });
  }

  // Step 2: Fetch the actual binary from the Azure Blob redirect target
  const blobResponse = await fetch(redirectUrl);

  if (!blobResponse.ok) {
    return new Response(`Failed to download voice pack (${blobResponse.status})`, {
      status: blobResponse.status,
    });
  }

  return new Response(blobResponse.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': blobResponse.headers.get('content-length') ?? '',
      'Cache-Control': 'public, max-age=604800, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
