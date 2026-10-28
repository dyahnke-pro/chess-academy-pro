// The explorer proxy's cache rule (WO-COURSE-01, 2026-10-28): a masters /
// amateur answer is held at Vercel's edge for 30 days — every user shares one
// answer per position instead of each day's first caller asking Lichess again,
// from shared addresses Lichess rate-limits — and an error is never cached.
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { EXPLORER_CACHE_CONTROL } from './lichess-explorer';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const req = (source: string): Request =>
  new Request(`https://chess-academy-pro.vercel.app/api/lichess-explorer?source=${source}&fen=${encodeURIComponent(FEN)}`, {
    headers: { Origin: 'https://chess-academy-pro.vercel.app' },
  });

afterEach(() => vi.unstubAllGlobals());

describe('explorer proxy cache', () => {
  it('holds a masters or amateur answer at the edge for 30 days', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"moves":[]}', { status: 200 })));
    for (const source of ['masters', 'lichess']) {
      const res = await handler(req(source));
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe(EXPLORER_CACHE_CONTROL);
      expect(EXPLORER_CACHE_CONTROL).toMatch(/s-maxage=2592000/);
    }
  });

  it('never caches a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>429 Too Many Requests</html>', { status: 429 })));
    const res = await handler(req('lichess'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Cache-Control') ?? '').not.toMatch(/s-maxage|max-age=[1-9]/);
  });
});
