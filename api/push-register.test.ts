import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let commands = 0;
const sets: [string, string][] = [];
vi.mock('@upstash/redis', () => ({
  Redis: class {
    set(k: string, v: string) { commands += 1; sets.push([k, v]); return Promise.resolve('OK'); }
    get() { commands += 1; return Promise.resolve(null); }
    del() { commands += 1; return Promise.resolve(1); }
  },
}));

function mkRes(): VercelResponse & { _status: number; _json: unknown } {
  const res = {
    _status: 0, _json: undefined as unknown,
    setHeader() { return res; },
    status(code: number) { res._status = code; return res; },
    json(p: unknown) { res._json = p; return res; },
    end() { return res; },
  };
  return res as unknown as VercelResponse & { _status: number; _json: unknown };
}
const HUMAN = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148' };
const DEVICE = 'a67bc748-5023-4476-9556-a05104d66fe2';
const TOKEN = 'c'.repeat(64);
const req = (body: unknown, headers: Record<string, string> = HUMAN, method = 'POST'): VercelRequest =>
  ({ method, headers, query: {}, body } as unknown as VercelRequest);

describe('/api/push-register', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = 'https://kv.test'; process.env.KV_REST_API_TOKEN = 'tok';
    commands = 0; sets.length = 0; vi.resetModules();
  });
  afterEach(() => { delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; });

  it('files the token under the device id', async () => {
    const { default: handler } = await import('./push-register');
    const res = mkRes();
    await handler(req({ device: DEVICE, token: TOKEN, environment: 'production', platform: 'ios' }), res);
    expect(res._status).toBe(200);
    expect(sets).toHaveLength(1);
    expect(sets[0][0]).toBe(`push:device:${DEVICE}`);
    expect(JSON.parse(sets[0][1])).toMatchObject({ token: TOKEN, environment: 'production', platform: 'ios' });
  });

  it.each([
    ['a bad device id', { device: 'bad id!', token: TOKEN, environment: 'production', platform: 'ios' }],
    ['a non-hex token', { device: DEVICE, token: 'nope', environment: 'production', platform: 'ios' }],
    ['an unknown environment', { device: DEVICE, token: TOKEN, environment: 'staging', platform: 'ios' }],
    ['a non-iOS platform', { device: DEVICE, token: TOKEN, environment: 'production', platform: 'android' }],
  ])('refuses %s with 400 and no Redis', async (_l, body) => {
    const { default: handler } = await import('./push-register');
    const res = mkRes();
    await handler(req(body), res);
    expect(res._status).toBe(400);
    expect(commands).toBe(0);
  });

  it.each([
    ['headless UA', { 'user-agent': 'Mozilla/5.0 HeadlessChrome/141.0.0.0' }],
    ['x-audit-marked', { 'user-agent': 'Safari', 'x-audit-marked': '1' }],
  ])('audit traffic from %s → 200, no Redis', async (_l, headers) => {
    const { default: handler } = await import('./push-register');
    const res = mkRes();
    await handler(req({ device: DEVICE, token: TOKEN, environment: 'production', platform: 'ios' }, headers), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ refused: 'audit' });
    expect(commands).toBe(0);
  });

  it('GET is 405', async () => {
    const { default: handler } = await import('./push-register');
    const res = mkRes();
    await handler(req(undefined, HUMAN, 'GET'), res);
    expect(res._status).toBe(405);
  });
});
