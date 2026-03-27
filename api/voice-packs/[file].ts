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
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400 });
  }

  const ghUrl = `${GITHUB_RELEASE_URL}/${file}`;

  // Fetch directly from GitHub Releases — let fetch follow redirects automatically.
  // This avoids SAS token expiration issues from manual redirect handling.
  const maxRetries = 3;
  let lastError: string = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(ghUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'ChessAcademyPro/1.0',
          'Accept': 'application/octet-stream',
        },
      });

      if (response.ok) {
        return new Response(response.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': response.headers.get('content-length') ?? '',
            'Cache-Control': 'public, max-age=604800, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      lastError = `HTTP ${response.status}`;

      // If 404, don't retry — file doesn't exist
      if (response.status === 404) {
        return new Response('Voice pack not found or not yet uploaded.', {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }

      // For 403 or other errors, try manual redirect approach as fallback
      if (attempt === 0) {
        const manualResponse = await fetch(ghUrl, { redirect: 'manual' });
        const redirectUrl = manualResponse.headers.get('location');
        if (redirectUrl) {
          const blobResponse = await fetch(redirectUrl);
          if (blobResponse.ok) {
            return new Response(blobResponse.body, {
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': blobResponse.headers.get('content-length') ?? '',
                'Cache-Control': 'public, max-age=604800, immutable',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
          lastError = `Redirect fetch: HTTP ${blobResponse.status}`;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return new Response(`Failed to download voice pack after ${maxRetries} attempts: ${lastError}`, {
    status: 502,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
