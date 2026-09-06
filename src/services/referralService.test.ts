import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/schema';
import { loadFreeTier } from './freeTierService';
import { getStatus, claimCode, reportQualifyingUse, grantReviewReward } from './referralService';

// deviceIdentity + analytics are mocked so the service is exercised in isolation.
vi.mock('./deviceIdentity', () => ({ getDeviceId: async () => 'test-device-123456' }));
vi.mock('./analytics', () => ({ captureEvent: vi.fn() }));

function mockFetchOnce(json: unknown, ok = true): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    json: async () => json,
  }));
}

beforeEach(async () => {
  await db.freeTier.clear();
  await db.meta.clear();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('referralService', () => {
  it('getStatus mirrors server credits into the ledger', async () => {
    mockFetchOnce({ code: 'ABC123', credits: 2, recruits: 1, claimed: { qualified: true, ts: 5 } });
    const status = await getStatus();
    expect(status).toMatchObject({ code: 'ABC123', credits: 2, recruits: 1 });
    expect((await loadFreeTier()).earnedOpeningCredits).toBe(2);
  });

  it('getStatus returns null (and no throw) when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getStatus()).toBeNull();
  });

  it('claimCode maps the server outcomes', async () => {
    mockFetchOnce({ ok: true });
    expect(await claimCode('xyz789')).toBe('ok');
    mockFetchOnce({ ok: false, reason: 'own-code' });
    expect(await claimCode('mine00')).toBe('own-code');
    mockFetchOnce({ ok: false, reason: 'unknown-code' });
    expect(await claimCode('nope00')).toBe('unknown-code');
  });

  it('reportQualifyingUse grants once, syncs credits, and does not re-report', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, granted: true, credits: 1 }) });
    vi.stubGlobal('fetch', fetchMock);

    await reportQualifyingUse();
    expect((await loadFreeTier()).earnedOpeningCredits).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call is short-circuited by the local once-flag — no network.
    await reportQualifyingUse();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('claiming a code AFTER a win re-arms qualify (clears the once-flag)', async () => {
    // 1) win first → qualify runs (no referral yet), sets the once-flag.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, granted: false }) }));
    await reportQualifyingUse();
    expect(await db.meta.get('referral.qualifyReported')).toBeTruthy();

    // 2) claim a code → the flag is cleared so a later win can qualify.
    mockFetchOnce({ ok: true });
    expect(await claimCode('friend7')).toBe('ok');
    expect(await db.meta.get('referral.qualifyReported')).toBeFalsy();

    // 3) next win qualifies the referral for real.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, granted: true, credits: 1 }) }));
    await reportQualifyingUse();
    expect((await loadFreeTier()).earnedOpeningCredits).toBe(1);
  });

  it('grantReviewReward syncs the granted credit', async () => {
    mockFetchOnce({ ok: true, granted: true, credits: 1 });
    await grantReviewReward();
    expect((await loadFreeTier()).earnedOpeningCredits).toBe(1);
  });

  it('grantReviewReward is a no-op when the server already rewarded (granted:false)', async () => {
    mockFetchOnce({ ok: true, granted: false, credits: 1 });
    await grantReviewReward();
    // syncOpeningCredits only runs on granted:true — the ledger stays at 0 here
    // (the credit was already synced on the earlier grant in real life).
    expect((await loadFreeTier()).earnedOpeningCredits ?? 0).toBe(0);
  });
});
