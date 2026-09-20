// 🔒 AN AUDIT CAN NEVER FILL REDIS (David 2026-09-19: "i no longer want audits
// to fill redis"). The server half of the gate: a POST that carries the
// client's `x-audit-marked` header, or comes from a headless browser, is
// acknowledged and stores NOTHING — no rpush, no memory buffer. Negative
// control: an unmarked POST from a normal browser still writes.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const calls: { cmd: string; args: unknown[] }[] = [];
vi.mock('@upstash/redis', () => ({
  Redis: class {
    rpush(...args: unknown[]) { calls.push({ cmd: 'rpush', args }); return Promise.resolve(args.length - 1); }
    ltrim(...args: unknown[]) { calls.push({ cmd: 'ltrim', args }); return Promise.resolve('OK'); }
    expire(...args: unknown[]) { calls.push({ cmd: 'expire', args }); return Promise.resolve(1); }
    lrange() { return Promise.resolve([]); }
  },
}));

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
const mkReq = (headers: Record<string, string>): VercelRequest => ({
  method: 'POST', query: {},
  body: { timestamp: 1000, kind: 'bad-fen', category: 'subsystem', summary: 'e', source: 't' },
  headers: { 'x-audit-secret': 's3cret', ...headers },
} as unknown as VercelRequest);

const NORMAL_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

describe('api/audit-stream — an audit can never fill Redis', () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.AUDIT_STREAM_SECRET = 's3cret';
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'tok';
  });

  it('refuses a POST carrying x-audit-marked: 200, stored 0, no rpush', async () => {
    const { default: handler } = await import('./audit-stream');
    const res = mkRes();
    await handler(mkReq({ 'x-audit-marked': '1', 'user-agent': NORMAL_UA }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ ok: true, storage: 'refused', stored: 0, refused: 'audit' });
    expect(calls.filter((c) => c.cmd === 'rpush')).toEqual([]);
  });

  it('refuses a headless browser by UA even without the header', async () => {
    const { default: handler } = await import('./audit-stream');
    const res = mkRes();
    await handler(mkReq({ 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/145.0.0.0 Safari/537.36' }), res);
    expect(res._json).toMatchObject({ stored: 0, refused: 'audit' });
    expect(calls.filter((c) => c.cmd === 'rpush')).toEqual([]);
  });

  it('negative control: an unmarked POST from a real browser still writes', async () => {
    const { default: handler } = await import('./audit-stream');
    const res = mkRes();
    await handler(mkReq({ 'user-agent': NORMAL_UA }), res);
    expect(res._json).toMatchObject({ ok: true, storage: 'redis', stored: 1 });
    expect(calls.filter((c) => c.cmd === 'rpush').length).toBe(1);
  });

  it('the refusal never lands in the memory fallback either', async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const { default: handler } = await import('./audit-stream');
    await handler(mkReq({ 'x-audit-marked': '1', 'user-agent': NORMAL_UA }), mkRes());
    const read = mkRes();
    await handler({ method: 'GET', query: { since: '0' }, headers: { 'x-audit-secret': 's3cret' } } as unknown as VercelRequest, read);
    const body = read._json as { entries: unknown[] };
    expect(body.entries.filter((e) => (e as { summary: string }).summary === 'e')).toEqual([]);
  });
});
