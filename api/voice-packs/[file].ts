export const config = { runtime: 'edge' };

const GITHUB_API_ASSET =
  'https://api.github.com/repos/dyahnke-pro/chess-academy-pro/releases/assets';

/** Map voice-pack filenames to GitHub release asset IDs.
 *  Only uploaded packs have a nonzero ID. */
const ASSET_MAP: Record<string, number> = {
  'af_bella_mp3.bin': 382462063,
};

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
      },
    });
  }

  const url = new URL(req.url);
  const file = url.pathname.split('/').pop();

  if (!file || !file.endsWith('.bin')) {
    return new Response('Invalid file', { status: 400, headers: corsHeaders });
  }

  const assetId = ASSET_MAP[file];
  if (!assetId) {
    return new Response('Voice pack not found or not yet uploaded.', {
      status: 404,
      headers: corsHeaders,
    });
  }

  try {
    // Step 1: Hit GitHub API to get a fresh CDN redirect URL.
    // Using redirect: 'manual' so we can extract the Location header.
    const apiResp = await fetch(`${GITHUB_API_ASSET}/${assetId}`, {
      redirect: 'manual',
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'ChessAcademyPro/1.0',
      },
    });

    const cdnUrl = apiResp.headers.get('location');
    if (!cdnUrl) {
      return new Response('Could not resolve download URL', {
        status: 502,
        headers: corsHeaders,
      });
    }

    // Step 2: Stream the file from the CDN back to the client.
    // The CDN lacks CORS headers, so we must proxy the bytes.
    const cdnResp = await fetch(cdnUrl);
    if (!cdnResp.ok || !cdnResp.body) {
      return new Response(`CDN returned ${cdnResp.status}`, {
        status: 502,
        headers: corsHeaders,
      });
    }

    return new Response(cdnResp.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': cdnResp.headers.get('content-length') ?? '',
        'Cache-Control': 'public, max-age=604800, immutable',
        ...corsHeaders,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Voice pack download failed: ${msg}`, {
      status: 502,
      headers: corsHeaders,
    });
  }
}
