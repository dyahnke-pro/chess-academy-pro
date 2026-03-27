import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

const GITHUB_RELEASE_URL =
  'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  const file = (req.query.file as string) ?? '';

  if (!file || !file.endsWith('.bin')) {
    res.status(400).send('Invalid file');
    return;
  }

  try {
    // Fetch from GitHub Releases — Node.js runtime follows redirects and
    // has no CORS restrictions, so this works directly.
    const ghResp = await fetch(`${GITHUB_RELEASE_URL}/${file}`, {
      headers: {
        'User-Agent': 'ChessAcademyPro/1.0',
        'Accept': 'application/octet-stream',
      },
    });

    if (!ghResp.ok || !ghResp.body) {
      res.status(ghResp.status).send(`GitHub returned ${ghResp.status}`);
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    const contentLength = ghResp.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.status(200);

    // Stream the body to the client
    const reader = ghResp.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const ok = res.write(Buffer.from(value));
        if (!ok) {
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
    } else {
      res.end();
    }
  }
}
