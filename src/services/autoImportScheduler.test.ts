import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildUserProfile } from '../test/factories';
import {
  AUTO_IMPORT_INTERVAL_MS,
  runAutoImportIfDue,
  _resetAutoImportSchedulerForTests,
} from './autoImportScheduler';

vi.mock('./chesscomService', () => ({
  importChessComGames: vi.fn(),
}));
vi.mock('./lichessService', () => ({
  importLichessGames: vi.fn(),
}));
vi.mock('./dbService', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./appAuditor', () => ({
  logAppAudit: vi.fn().mockResolvedValue(undefined),
}));

import { importChessComGames } from './chesscomService';
import { importLichessGames } from './lichessService';
import { updateProfile } from './dbService';

describe('autoImportScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetAutoImportSchedulerForTests();
  });

  it('skips both services when no usernames configured', async () => {
    const profile = buildUserProfile();
    const results = await runAutoImportIfDue(profile);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.skipped === 'no-username')).toBe(true);
    expect(importChessComGames).not.toHaveBeenCalled();
    expect(importLichessGames).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('runs chess.com import when username set + never imported', async () => {
    vi.mocked(importChessComGames).mockResolvedValue(7);
    const profile = buildUserProfile({
      preferences: { chessComUsername: 'magnus' },
    });
    const results = await runAutoImportIfDue(profile, { now: 1_000_000 });
    const cc = results.find((r) => r.service === 'chesscom');
    expect(cc).toMatchObject({ username: 'magnus', imported: 7, skipped: null });
    expect(importChessComGames).toHaveBeenCalledWith('magnus');
    expect(updateProfile).toHaveBeenCalledWith(
      profile.id,
      expect.objectContaining({
        preferences: expect.objectContaining({ lastChessComAutoImportAt: 1_000_000 }),
      }),
    );
  });

  it('skips chess.com import when last import is within interval', async () => {
    const now = 100_000_000;
    const profile = buildUserProfile({
      preferences: {
        chessComUsername: 'magnus',
        lastChessComAutoImportAt: now - (AUTO_IMPORT_INTERVAL_MS - 1000),
      },
    });
    const results = await runAutoImportIfDue(profile, { now });
    const cc = results.find((r) => r.service === 'chesscom');
    expect(cc?.skipped).toBe('too-soon');
    expect(importChessComGames).not.toHaveBeenCalled();
  });

  it('runs chess.com import when last import is older than interval', async () => {
    const now = 100_000_000;
    vi.mocked(importChessComGames).mockResolvedValue(3);
    const profile = buildUserProfile({
      preferences: {
        chessComUsername: 'magnus',
        lastChessComAutoImportAt: now - (AUTO_IMPORT_INTERVAL_MS + 1),
      },
    });
    const results = await runAutoImportIfDue(profile, { now });
    const cc = results.find((r) => r.service === 'chesscom');
    expect(cc?.skipped).toBeNull();
    expect(cc?.imported).toBe(3);
    expect(importChessComGames).toHaveBeenCalledWith('magnus');
  });

  it('records error but does not bump timestamp on failure', async () => {
    vi.mocked(importChessComGames).mockRejectedValue(new Error('Player not found'));
    const profile = buildUserProfile({
      preferences: { chessComUsername: 'ghost' },
    });
    const results = await runAutoImportIfDue(profile, { now: 50_000 });
    const cc = results.find((r) => r.service === 'chesscom');
    expect(cc?.error).toContain('Player not found');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('runs both services in one pass when both due', async () => {
    vi.mocked(importChessComGames).mockResolvedValue(2);
    vi.mocked(importLichessGames).mockResolvedValue(5);
    const profile = buildUserProfile({
      preferences: {
        chessComUsername: 'a',
        lichessUsername: 'b',
      },
    });
    const results = await runAutoImportIfDue(profile, { now: 1234 });
    expect(results.find((r) => r.service === 'chesscom')?.imported).toBe(2);
    expect(results.find((r) => r.service === 'lichess')?.imported).toBe(5);
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith(
      profile.id,
      expect.objectContaining({
        preferences: expect.objectContaining({
          lastChessComAutoImportAt: 1234,
          lastLichessAutoImportAt: 1234,
        }),
      }),
    );
  });

  it('returns the same in-flight promise on concurrent calls', async () => {
    let resolve: (n: number) => void = () => {};
    vi.mocked(importChessComGames).mockReturnValue(
      new Promise<number>((res) => { resolve = res; }),
    );
    const profile = buildUserProfile({
      preferences: { chessComUsername: 'a' },
    });
    const p1 = runAutoImportIfDue(profile);
    const p2 = runAutoImportIfDue(profile);
    expect(p1).toBe(p2);
    resolve(1);
    await p1;
    expect(importChessComGames).toHaveBeenCalledTimes(1);
  });

  it('calls onProfileUpdated with the patched profile when timestamps change', async () => {
    vi.mocked(importChessComGames).mockResolvedValue(1);
    const profile = buildUserProfile({
      preferences: { chessComUsername: 'magnus' },
    });
    const onProfileUpdated = vi.fn();
    await runAutoImportIfDue(profile, { now: 9999, onProfileUpdated });
    expect(onProfileUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: expect.objectContaining({ lastChessComAutoImportAt: 9999 }),
      }),
    );
  });
});
