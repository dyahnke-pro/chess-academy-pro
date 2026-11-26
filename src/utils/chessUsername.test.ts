// 🔒 Every failed first import on an App Store phone (30 days) was
// `user-not-found`: the importers sent the box's text as typed. Fails on the
// old code: the request URL carried the trailing space / the link / the "@".
import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeChessUsername } from './chessUsername';
import { importChessComStats } from '../services/chesscomService';

describe('normalizeChessUsername', () => {
  it('reads the name out of what a phone keyboard leaves', () => {
    expect(normalizeChessUsername('jerry0303 ')).toBe('jerry0303');
    expect(normalizeChessUsername('  @jerry0303')).toBe('jerry0303');
    expect(normalizeChessUsername('https://www.chess.com/member/Jerry0303')).toBe('Jerry0303');
    expect(normalizeChessUsername('https://lichess.org/@/DrNykterstein')).toBe('DrNykterstein');
    expect(normalizeChessUsername('lichess.org/DrNykterstein')).toBe('DrNykterstein');
    expect(normalizeChessUsername('plain_name-1')).toBe('plain_name-1');
  });
});

describe('the importer asks the site for the name, not the keystrokes', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('a trailing space never reaches chess.com', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await importChessComStats('jerry0303 ').catch(() => undefined);
    expect(fetch.mock.calls[0][0] as string).toContain('/player/jerry0303/stats');
  });
});
