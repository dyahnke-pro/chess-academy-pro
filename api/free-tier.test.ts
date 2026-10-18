import { describe, it, expect } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler, { EMPTY_LEDGER, mergeLedger, toLedger, safeDevice } from './free-tier';

function res(): VercelResponse & { body: unknown; code: number } {
  const r = { body: null as unknown, code: 0, headers: {} as Record<string, string> };
  const api = {
    setHeader(k: string, v: string) { r.headers[k] = v; return api; },
    status(c: number) { r.code = c; return api; },
    json(b: unknown) { r.body = b; return api; },
    end() { return api; },
    get body() { return r.body; },
    get code() { return r.code; },
  };
  return api as unknown as VercelResponse & { body: unknown; code: number };
}
const req = (method: string, init: { query?: Record<string, string>; body?: unknown; headers?: Record<string, string> } = {}): VercelRequest =>
  ({ method, query: init.query ?? {}, body: init.body, headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', ...(init.headers ?? {}) } }) as unknown as VercelRequest;

describe('free-tier ledger merge is forward-only', () => {
  it('a fresh install posting zeros cannot reset spent allowance', () => {
    const spent = toLedger({ puzzlesSolved: 20, coachSpendUsd: 1.04, freeOpeningIds: ['vienna-game'], kidFirstAccessAt: 1000 });
    const fresh = toLedger({ puzzlesSolved: 0, coachSpendUsd: 0, freeOpeningIds: [], kidFirstAccessAt: 5000 });
    expect(mergeLedger(spent, fresh)).toEqual({ ...spent, kidFirstAccessAt: 1000 });
  });
  it('unions claimed openings and keeps the earliest kid window', () => {
    const m = mergeLedger(toLedger({ freeOpeningIds: ['a'], kidFirstAccessAt: 9 }), toLedger({ freeOpeningIds: ['b'], kidFirstAccessAt: 3 }));
    expect(m.freeOpeningIds).toEqual(['a', 'b']);
    expect(m.kidFirstAccessAt).toBe(3);
  });
  it('drops junk input', () => {
    expect(toLedger({ puzzlesSolved: -5, coachSpendUsd: 'x', freeOpeningIds: [1, 'ok'] })).toEqual({ ...EMPTY_LEDGER, freeOpeningIds: ['ok'] });
    expect(safeDevice('../etc')).toBeNull();
    expect(safeDevice('3f2a9c1e-77aa-4b2c-9d10-aa11bb22cc33')).toBe('3f2a9c1e-77aa-4b2c-9d10-aa11bb22cc33');
  });
});

describe('/api/free-tier', () => {
  const device = 'kc-test-device-0001';
  it('remembers a ledger and refuses to lower it', async () => {
    const r1 = res();
    await handler(req('POST', { body: { device, ledger: { coachSpendUsd: 1.1, puzzlesSolved: 20 } } }), r1);
    expect((r1.body as { ledger: { coachSpendUsd: number } }).ledger.coachSpendUsd).toBe(1.1);
    const r2 = res();
    await handler(req('POST', { body: { device, ledger: { coachSpendUsd: 0, puzzlesSolved: 0 } } }), r2);
    const r3 = res();
    await handler(req('GET', { query: { device } }), r3);
    expect((r3.body as { ledger: { coachSpendUsd: number; puzzlesSolved: number } }).ledger).toMatchObject({ coachSpendUsd: 1.1, puzzlesSolved: 20 });
  });
  it('refuses audit traffic before any store', async () => {
    const r = res();
    await handler(req('POST', { body: { device, ledger: {} }, headers: { 'x-audit-marked': '1' } }), r);
    expect(r.body).toMatchObject({ refused: 'audit' });
  });
  it('rejects a missing device', async () => {
    const r = res();
    await handler(req('GET'), r);
    expect(r.code).toBe(400);
  });
});
