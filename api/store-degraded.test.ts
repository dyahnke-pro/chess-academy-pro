import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// A Redis whose every command fails the way Upstash does past its monthly cap.
vi.mock('@upstash/redis', () => ({
  Redis: class {
    private fail() { return Promise.reject(new Error('ERR max requests limit exceeded. Limit: 500000, Usage: 500000')); }
    get() { return this.fail(); } set() { return this.fail(); } incr() { return this.fail(); }
    lrange() { return this.fail(); } rpush() { return this.fail(); } ltrim() { return this.fail(); }
    zadd() { return this.fail(); } zrange() { return this.fail(); } expire() { return this.fail(); }
  },
}));

function mkRes(): VercelResponse & { _status: number; _json: unknown; _headers: Record<string, string> } {
  const res = {
    _status: 0, _json: undefined as unknown, _headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { res._headers[k] = v; return res; },
    status(code: number) { res._status = code; return res; },
    json(payload: unknown) { res._json = payload; return res; },
    end() { return res; },
  };
  return res as unknown as VercelResponse & { _status: number; _json: unknown; _headers: Record<string, string> };
}
const mkGet = (query: Record<string, unknown>): VercelRequest => ({ method: 'GET', query, body: undefined, headers: {} } as unknown as VercelRequest);

describe('bell + referral GETs degrade to 200 when the store is down', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = 'https://kv.test';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.resetModules();
  });
  afterEach(() => { delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });

  it('/api/messages returns an empty bell, not a 500 on every boot', async () => {
    const { default: handler } = await import('./messages');
    const res = mkRes();
    await handler(mkGet({ device: 'a67bc748-5023-4476-9556-a05104d66fe2' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ broadcasts: [], thread: [], degraded: true });
    expect(res._headers['x-store']).toBe('degraded');
  });

  it('/api/referrals returns no referral state (code=null), not a 500', async () => {
    const { default: handler } = await import('./referrals');
    const res = mkRes();
    await handler(mkGet({ device: 'a67bc748-5023-4476-9556-a05104d66fe2' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ code: null, credits: 0, recruits: 0, claimed: null, degraded: true });
  });
});
