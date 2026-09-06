import { describe, it, expect } from 'vitest';
import handler from './referrals';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// No Redis env → the handler uses its in-memory fallback store (module-level),
// so each test uses UNIQUE device ids to stay isolated.
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
function mkReq(method: string, opts: { query?: Record<string, unknown>; body?: unknown } = {}): VercelRequest {
  return { method, query: opts.query ?? {}, body: opts.body, headers: {} } as unknown as VercelRequest;
}
async function get(device: string): Promise<{ code: string; credits: number; recruits: number; claimed: unknown }> {
  const res = mkRes();
  await handler(mkReq('GET', { query: { device } }), res);
  return res._json as { code: string; credits: number; recruits: number; claimed: unknown };
}
async function post(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = mkRes();
  await handler(mkReq('POST', { body }), res);
  return { status: res._status, json: res._json as Record<string, unknown> };
}

describe('api/referrals — codes, claim, qualify, review', () => {
  it('issues a stable code per device', async () => {
    const a = await get('refDEVICE_a1');
    expect(a.code).toMatch(/^[A-Z0-9]{4,12}$/);
    expect(a.credits).toBe(0);
    const again = await get('refDEVICE_a1');
    expect(again.code).toBe(a.code); // stable
  });

  it('rejects a malformed device id', async () => {
    const r = await post({ action: 'qualify', device: 'bad id!!' });
    expect(r.status).toBe(400);
  });

  it('a friend claims a code, qualifies, and BOTH earn a credit (once)', async () => {
    const referrer = 'refREFERRER_1';
    const friend = 'refFRIEND_1';
    const r = await get(referrer); // issue referrer's code

    const claim = await post({ action: 'claim', device: friend, code: r.code });
    expect(claim.json.ok).toBe(true);

    // Not credited until the friend qualifies on real use.
    expect((await get(referrer)).credits).toBe(0);
    expect((await get(friend)).credits).toBe(0);

    const q = await post({ action: 'qualify', device: friend });
    expect(q.json).toMatchObject({ granted: true, credits: 1 });

    expect((await get(friend)).credits).toBe(1);
    const refAfter = await get(referrer);
    expect(refAfter.credits).toBe(1);
    expect(refAfter.recruits).toBe(1);

    // Qualifying again is idempotent — no double credit.
    const q2 = await post({ action: 'qualify', device: friend });
    expect(q2.json.granted).toBe(false);
    expect((await get(friend)).credits).toBe(1);
    expect((await get(referrer)).credits).toBe(1);
  });

  it('rejects your own code, unknown codes, and a second claim', async () => {
    const self = 'refSELF_1';
    const me = await get(self);
    expect((await post({ action: 'claim', device: self, code: me.code })).json).toMatchObject({ ok: false, reason: 'own-code' });

    const other = 'refOTHER_1';
    expect((await post({ action: 'claim', device: other, code: 'ZZZZZZ' })).json).toMatchObject({ ok: false, reason: 'unknown-code' });

    const ref = await get('refREFERRER_2');
    const friend = 'refFRIEND_2';
    expect((await post({ action: 'claim', device: friend, code: ref.code })).json.ok).toBe(true);
    // second claim (even a different valid code) is rejected — one referral per device, lifetime
    const ref2 = await get('refREFERRER_3');
    expect((await post({ action: 'claim', device: friend, code: ref2.code })).json).toMatchObject({ ok: false, reason: 'already-claimed' });
  });

  it('qualify without a referral is a no-op (granted:false), never an error', async () => {
    const r = await post({ action: 'qualify', device: 'refNOREF_1' });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, granted: false });
    expect((await get('refNOREF_1')).credits).toBe(0);
  });

  it('the review reward grants exactly once per device', async () => {
    const d = 'refREVIEW_1';
    const first = await post({ action: 'reviewReward', device: d });
    expect(first.json).toMatchObject({ granted: true, credits: 1 });
    const second = await post({ action: 'reviewReward', device: d });
    expect(second.json.granted).toBe(false);
    expect((await get(d)).credits).toBe(1);
  });
});
