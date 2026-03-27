import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 300,
};

const GITHUB_API_ASSET =
  'https://api.github.com/repos/dyahnke-pro/chess-academy-pro/releases/assets';

/** Map voice-pack filenames to GitHub release asset IDs. */
const ASSET_MAP: Record<string, number> = {
  'af_bella_mp3.bin': 382462063,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.status(204).end();
    return;
  }

  const file = (req.query.file as string) ?? '';

  if (!file || !file.endsWith('.bin')) {
    res.status(400).send('Invalid file');
    return;
  }

  const assetId = ASSET_MAP[file];
  if (!assetId) {
    res.status(404).send('Voice pack not found or not yet uploaded.');
    return;
  }

  try {
    // Step 1: Hit GitHub API to get a fresh CDN redirect URL
    const apiResp = await fetch(`${GITHUB_API_ASSET}/${assetId}`, {
      redirect: 'manual',
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'ChessAcademyPro/1.0',
      },
    });

    const cdnUrl = apiResp.headers.get('location');
    if (!cdnUrl) {
      res.status(502).send('Could not resolve download URL');
      return;
    }

    // Step 2: Stream the file from the CDN back to the client
    const cdnResp = await fetch(cdnUrl);
    if (!cdnResp.ok || !cdnResp.body) {
      res.status(502).send(`CDN returned ${cdnResp.status}`);
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    const contentLength = cdnResp.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

    // Stream the body using the Web ReadableStream
    const reader = cdnResp.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        // Write chunk to Node.js response stream
        const canContinue = res.write(Buffer.from(value));
        if (!canContinue) {
          // Wait for drain if backpressure
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(502).send(`Voice pack download failed: ${msg}`);
    }
  }
}
