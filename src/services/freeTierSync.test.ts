import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../db/schema';
import { loadFreeTier, recordCoachSpend, hasCoachAccessLeft, recordPuzzleSolved } from './freeTierService';
import { startFreeTierSync, resetFreeTierSyncForTest } from './freeTierSync';

vi.mock('./deviceIdentity', () => ({ getDeviceId: async () => 'kc-install-abcdef' }));

/** A stand-in server holding the ledger for this install. */
let server: Record<string, unknown> | null = null;
const posts: unknown[] = [];

beforeEach(async () => {
  await db.delete();
  await db.open();
  resetFreeTierSyncForTest();
  server = null;
  posts.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string) as { ledger: Record<string, unknown> };
      posts.push(body);
      server = body.ledger;
      return new Response(JSON.stringify({ ledger: server }), { status: 200 });
    }
    return new Response(JSON.stringify({ ledger: server }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('freeTierSync — the allowance survives a reinstall', () => {
  it('a reinstalled app reads back the spend it already used, and stays walled', async () => {
    // What the server remembers from the first install.
    server = { puzzlesSolved: 20, coachSpendUsd: 1.03, coachLessonsUsed: 4, coachChatTurnsUsed: 60, freeOpeningIds: ['vienna-game'], trainingOpeningCredits: 0, kidFirstAccessAt: null };
    // The reinstall: a brand-new local database.
    expect(hasCoachAccessLeft(await loadFreeTier())).toBe(true);
    await startFreeTierSync({ native: true });
    const row = await loadFreeTier();
    expect(row.coachSpendUsd).toBe(1.03);
    expect(row.puzzlesSolved).toBe(20);
    expect(row.freeOpeningIds).toContain('vienna-game');
    expect(hasCoachAccessLeft(row)).toBe(false);
  });

  it('local usage is sent to the server after a write', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await startFreeTierSync({ native: true });
    await recordCoachSpend(0.2);
    await recordPuzzleSolved();
    await vi.advanceTimersByTimeAsync(2000);
    const last = posts.at(-1) as { device: string; ledger: { coachSpendUsd: number; puzzlesSolved: number } };
    expect(last.device).toBe('kc-install-abcdef');
    expect(last.ledger.coachSpendUsd).toBeCloseTo(0.2);
    expect(last.ledger.puzzlesSolved).toBe(1);
  });

  it('the server cannot hand allowance back', async () => {
    await recordCoachSpend(0.5);
    server = { puzzlesSolved: 0, coachSpendUsd: 0.1, coachLessonsUsed: 0, coachChatTurnsUsed: 0, freeOpeningIds: [], trainingOpeningCredits: 0, kidFirstAccessAt: null };
    await startFreeTierSync({ native: true });
    expect((await loadFreeTier()).coachSpendUsd).toBeCloseTo(0.5);
  });

  it('does nothing on the web', async () => {
    await startFreeTierSync({ native: false });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
