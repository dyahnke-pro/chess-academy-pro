import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// One Redis command per POST, however many entries it carries (the Upstash
// monthly cap was found exhausted at 3 commands per event, 2026-09-07).
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
const mkReq = (body: unknown): VercelRequest => ({ method: 'POST', query: {}, body, headers: { 'x-audit-secret': 's3cret' } } as unknown as VercelRequest);
const entry = (i: number) => ({ timestamp: 1000 + i, kind: 'bad-fen', category: 'subsystem', summary: `e${i}`, source: 't' });

describe('api/audit-stream — batched writes', () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.AUDIT_STREAM_SECRET = 's3cret';
    process.env.KV_REST_API_URL = 'https://kv.test';
    process.env.KV_REST_API_TOKEN = 'tok';
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.AUDIT_STREAM_SECRET; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  });

  it('an array body is ONE rpush carrying every entry', async () => {
    const { default: handler } = await import('./audit-stream');
    const res = mkRes();
    await handler(mkReq([entry(1), entry(2), entry(3)]), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ ok: true, storage: 'redis', stored: 3 });
    const pushes = calls.filter((c) => c.cmd === 'rpush');
    expect(pushes.length).toBe(1);
    expect(pushes[0].args.length).toBe(1 + 3); // key + 3 values
  });

  it('a single entry (the sidecar / legacy shape) still writes', async () => {
    const { default: handler } = await import('./audit-stream');
    const res = mkRes();
    await handler(mkReq(entry(9)), res);
    expect(res._json).toMatchObject({ ok: true, stored: 1 });
    expect(calls.filter((c) => c.cmd === 'rpush').length).toBe(1);
  });

  it('trim + TTL ride every 25th write, not every write', async () => {
    const { default: handler } = await import('./audit-stream');
    for (let i = 0; i < 30; i++) await handler(mkReq([entry(i)]), mkRes());
    expect(calls.filter((c) => c.cmd === 'rpush').length).toBe(30);
    expect(calls.filter((c) => c.cmd === 'ltrim').length).toBe(2); // writes #0 and #25
    expect(calls.filter((c) => c.cmd === 'expire').length).toBe(2);
  });

  it('drops malformed entries inside a batch and 400s only when none survive', async () => {
    const { default: handler } = await import('./audit-stream');
    const ok = mkRes();
    await handler(mkReq([{ nope: true }, entry(1)]), ok);
    expect(ok._json).toMatchObject({ stored: 1 });
    const bad = mkRes();
    await handler(mkReq([{ nope: true }]), bad);
    expect(bad._status).toBe(400);
  });
});
