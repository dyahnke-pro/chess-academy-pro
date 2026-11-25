import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const notifyDevice = vi.fn();
vi.mock('./_lib/pushTokens.js', async (orig) => ({
  ...(await orig<typeof import('./_lib/pushTokens')>()),
  notifyDevice: (...a: unknown[]) => notifyDevice(...a),
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
const devReply = (device: string, body: string): VercelRequest =>
  ({ method: 'POST', headers: { 'x-admin-secret': 's3cret' }, query: {}, body: { action: 'devReply', device, body } } as unknown as VercelRequest);

describe('devReply pushes the reply to the device', () => {
  beforeEach(() => { process.env.ADMIN_MESSAGE_SECRET = 's3cret'; notifyDevice.mockReset(); });
  afterEach(() => { delete process.env.ADMIN_MESSAGE_SECRET; });

  it('sends "New message from David" with the reply text to that device', async () => {
    notifyDevice.mockResolvedValue({ sent: true, environment: 'production' });
    const { default: handler } = await import('./messages');
    const res = mkRes();
    await handler(devReply('devPUSH0001', 'Good question — try the Caro-Kann.'), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ ok: true, push: 'sent' });
    expect(notifyDevice).toHaveBeenCalledTimes(1);
    const [device, alert] = notifyDevice.mock.calls[0] as [string, { title: string; body: string; data: Record<string, string> }];
    expect(device).toBe('devPUSH0001');
    expect(alert).toMatchObject({ title: 'New message from David', body: 'Good question — try the Caro-Kann.', data: { open: 'bell' } });
  });

  it('a push that throws never fails the reply, and the reply is still filed', async () => {
    notifyDevice.mockRejectedValue(new Error('apns down'));
    const { default: handler } = await import('./messages');
    const res = mkRes();
    await handler(devReply('devPUSH0002', 'hello'), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ ok: true, push: 'failed' });
    const get = mkRes();
    await handler({ method: 'GET', headers: {}, query: { device: 'devPUSH0002' } } as unknown as VercelRequest, get);
    expect((get._json as { thread: { from: string; body: string }[] }).thread.at(-1)).toMatchObject({ from: 'dev', body: 'hello' });
  });

  it('a user reply sends no push', async () => {
    const { default: handler } = await import('./messages');
    await handler({ method: 'POST', headers: {}, query: {}, body: { action: 'reply', device: 'devPUSH0003', body: 'hi' } } as unknown as VercelRequest, mkRes());
    expect(notifyDevice).not.toHaveBeenCalled();
  });
});
