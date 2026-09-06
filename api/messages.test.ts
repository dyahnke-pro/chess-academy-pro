import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler from './messages';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// No Redis env → the handler uses its in-memory fallback store. Module-level, so
// each test uses a UNIQUE device id to stay isolated.
function mkRes(): VercelResponse & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: undefined as unknown,
    setHeader() { return res; },
    status(code: number) { res._status = code; return res; },
    json(payload: unknown) { res._json = payload; return res; },
    end() { return res; },
  };
  return res as unknown as VercelResponse & { _status: number; _json: unknown };
}
function mkReq(method: string, opts: { query?: Record<string, unknown>; body?: unknown; adminSecret?: string } = {}): VercelRequest {
  return {
    method,
    query: opts.query ?? {},
    body: opts.body,
    headers: opts.adminSecret ? { 'x-admin-secret': opts.adminSecret } : {},
  } as unknown as VercelRequest;
}

describe('api/messages — admin gate + device scoping', () => {
  beforeEach(() => { delete process.env.ADMIN_MESSAGE_SECRET; });
  afterEach(() => { delete process.env.ADMIN_MESSAGE_SECRET; });

  it('a user can reply to their own thread and read it back (no auth needed)', async () => {
    const device = 'devUSER_read01';
    const post = mkRes();
    await handler(mkReq('POST', { body: { action: 'reply', device, body: 'hi dave' } }), post);
    expect(post._status).toBe(200);

    const get = mkRes();
    await handler(mkReq('GET', { query: { device } }), get);
    expect(get._status).toBe(200);
    const payload = get._json as { thread: { from: string; body: string }[] };
    expect(payload.thread.at(-1)).toMatchObject({ from: 'user', body: 'hi dave' });
  });

  it('rejects a malformed device id', async () => {
    const res = mkRes();
    await handler(mkReq('POST', { body: { action: 'reply', device: 'bad id!!', body: 'x' } }), res);
    expect(res._status).toBe(400);
  });

  it('broadcast is 501 when ADMIN_MESSAGE_SECRET is unset (never silently accepts)', async () => {
    const res = mkRes();
    await handler(mkReq('POST', { body: { action: 'broadcast', title: 'T', body: 'B' } }), res);
    expect(res._status).toBe(501);
  });

  it('broadcast is 401 without the secret, 200 with it', async () => {
    process.env.ADMIN_MESSAGE_SECRET = 's3cret';
    const noAuth = mkRes();
    await handler(mkReq('POST', { body: { action: 'broadcast', title: 'T', body: 'Hello all' } }), noAuth);
    expect(noAuth._status).toBe(401);

    const wrong = mkRes();
    await handler(mkReq('POST', { body: { action: 'broadcast', body: 'x' }, adminSecret: 'nope' }), wrong);
    expect(wrong._status).toBe(401);

    const ok = mkRes();
    await handler(mkReq('POST', { body: { action: 'broadcast', title: 'Notice', body: 'Be patient — new app' }, adminSecret: 's3cret' }), ok);
    expect(ok._status).toBe(200);

    // Every device now sees the broadcast.
    const get = mkRes();
    await handler(mkReq('GET', { query: { device: 'devANY_0001' } }), get);
    const payload = get._json as { broadcasts: { body: string }[] };
    expect(payload.broadcasts.some((b) => b.body === 'Be patient — new app')).toBe(true);
  });

  it('devReply requires the admin secret and lands in that device thread', async () => {
    process.env.ADMIN_MESSAGE_SECRET = 's3cret';
    const device = 'devUSER_reply9';
    const denied = mkRes();
    await handler(mkReq('POST', { body: { action: 'devReply', device, body: 'thanks!' } }), denied);
    expect(denied._status).toBe(401);

    const ok = mkRes();
    await handler(mkReq('POST', { body: { action: 'devReply', device, body: 'thanks for the feedback' }, adminSecret: 's3cret' }), ok);
    expect(ok._status).toBe(200);

    const get = mkRes();
    await handler(mkReq('GET', { query: { device } }), get);
    const payload = get._json as { thread: { from: string; body: string }[] };
    expect(payload.thread.at(-1)).toMatchObject({ from: 'dev', body: 'thanks for the feedback' });
  });

  it('the threads list is admin-only', async () => {
    process.env.ADMIN_MESSAGE_SECRET = 's3cret';
    const denied = mkRes();
    await handler(mkReq('GET', { query: { threads: '1' } }), denied);
    expect(denied._status).toBe(401);

    const ok = mkRes();
    await handler(mkReq('GET', { query: { threads: '1' }, adminSecret: 's3cret' }), ok);
    expect(ok._status).toBe(200);
    expect(Array.isArray((ok._json as { threads: unknown[] }).threads)).toBe(true);
  });
});
