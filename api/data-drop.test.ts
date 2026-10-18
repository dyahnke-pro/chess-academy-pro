import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const put = vi.fn(async (path: string) => ({ pathname: `${path.replace(/\.json(\.gz)?$/, '')}-RANDOM.json`, url: 'https://x' }));
vi.mock('@vercel/blob', () => ({ put: (...a: unknown[]) => put(...(a as [string])) }));

function mkRes(): VercelResponse & { _status: number; _json: unknown } {
  const res = {
    _status: 0, _json: undefined as unknown,
    setHeader() { return res; },
    status(code: number) { res._status = code; return res; },
    json(payload: unknown) { res._json = payload; return res; },
    end() { return res; },
  };
  return res as unknown as VercelResponse & { _status: number; _json: unknown };
}
const mkReq = (method: string, headers: Record<string, string>, body: string): VercelRequest => {
  const r = Readable.from([Buffer.from(body)]) as unknown as VercelRequest;
  Object.assign(r, { method, headers });
  return r;
};
const HUMAN = { 'user-agent': 'Mozilla/5.0 (iPhone) Mobile/15E148', 'x-device-id': 'abc-123', origin: 'capacitor://app.chessacademy.pro' };
const PAYLOAD = JSON.stringify({ stores: { games: [{ id: 'g1' }] } });

describe('/api/data-drop', () => {
  beforeEach(() => { put.mockClear(); vi.resetModules(); });

  it('stores ONE object per tap and returns its code', async () => {
    const { default: h } = await import('./data-drop');
    const res = mkRes();
    await h(mkReq('POST', HUMAN, PAYLOAD), res);
    expect(res._status).toBe(200);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toMatch(/^data-drop\/abc-123-/);
    expect((res._json as { code: string }).code).toMatch(/^data-drop\//);
  });

  it('refuses audit traffic without storing a byte', async () => {
    const { default: h } = await import('./data-drop');
    const res = mkRes();
    await h(mkReq('POST', { ...HUMAN, 'user-agent': 'HeadlessChrome/141' }, PAYLOAD), res);
    expect((res._json as { refused?: string }).refused).toBe('audit');
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses a third-party origin and a GET', async () => {
    const { default: h } = await import('./data-drop');
    const a = mkRes();
    await h(mkReq('POST', { ...HUMAN, origin: 'https://evil.example' }, PAYLOAD), a);
    expect(a._status).toBe(403);
    const b = mkRes();
    await h(mkReq('GET', HUMAN, ''), b);
    expect(b._status).toBe(405);
    expect(put).not.toHaveBeenCalled();
  });
});
