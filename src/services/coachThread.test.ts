import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildMistakePuzzle } from '../test/factories';
import {
  positionTouchesThread,
  threadCallbackFor,
  threadEvidenceClause,
  resetThreadCallbacks,
  threadCallbackAlreadySpoken,
  type CoachingThread,
} from './coachThread';

const thread: CoachingThread = {
  tag: 'removal-of-guard',
  label: 'Removal of the guard',
  patternThemes: ['fork', 'hangingPiece'],
  count: 4,
  games: 3,
  drilledAt: 1_000,
  lastSeenAt: 1_000,
};

describe('positionTouchesThread', () => {
  it('matches on a shared pattern theme', () => {
    expect(positionTouchesThread(thread, ['fork', 'endgame'])).toBe(true);
  });
  it('matches on the thread tag itself', () => {
    expect(positionTouchesThread(thread, ['removal-of-guard'])).toBe(true);
  });
  it('does not match an unrelated position', () => {
    expect(positionTouchesThread(thread, ['backRankMate', 'pin'])).toBe(false);
  });
  it('never matches a null thread', () => {
    expect(positionTouchesThread(null, ['fork'])).toBe(false);
  });
});

describe('threadCallbackFor — earned + say-once', () => {
  beforeEach(() => resetThreadCallbacks());

  it('speaks the callback when the position touches the thread, naming slips AND games', () => {
    const line = threadCallbackFor(thread, ['fork']);
    expect(line).toBe("This is the removal of the guard we've been working on — 4 slips across 3 games.");
  });

  it('says it at most ONCE per session (never nags)', () => {
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
    expect(threadCallbackAlreadySpoken('removal-of-guard')).toBe(true);
    // A second touch in the same session is silent.
    expect(threadCallbackFor(thread, ['hangingPiece'])).toBe('');
  });

  it('is silent when the position does not touch the thread', () => {
    expect(threadCallbackFor(thread, ['pin'])).toBe('');
  });

  it('drops the count clause for a first-time (count < 2) thread', () => {
    const fresh: CoachingThread = { ...thread, count: 1, games: 1 };
    expect(threadCallbackFor(fresh, ['fork'])).toBe("This is the removal of the guard we've been working on.");
  });

  it('resets across sessions so the thread can resurface', () => {
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
    resetThreadCallbacks();
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
  });
});

// THE C10 GATE (WO-STANDARD-01, 2026-09-22). Heard on prod five minutes after
// an import: "This is the missed tactical sequences we've been working on —
// that's 10 games running now." The 10 was OCCURRENCES (×10 in My Mistakes,
// six games) and no drill had ever happened. Two claims, each now earned by
// its own computed fact — reverting either (games := count, or dropping the
// drilledAt branch) fails the rows below.
describe('threadCallbackFor — C10: occurrences are not games, and "working on" needs a drill', () => {
  beforeEach(() => resetThreadCallbacks());

  it('10 occurrences across 6 games with ZERO drills → "10 slips across 6 games", never "we\'ve been working on"', () => {
    const t: CoachingThread = { ...thread, tag: 'analysis:tactic:tactical_sequence', label: 'Missed tactical sequences', patternThemes: ['tactical_sequence'], count: 10, games: 6, drilledAt: null };
    const line = threadCallbackFor(t, ['tactical_sequence']);
    expect(line).toBe('This is the missed tactical sequences from your games — 10 slips across 6 games.');
    expect(line).not.toMatch(/we've been working on/);
    expect(line).not.toMatch(/10 games/);
  });

  it('the same thread AFTER a drill session earns "we\'ve been working on"', () => {
    const t: CoachingThread = { ...thread, count: 10, games: 6, drilledAt: Date.now() };
    expect(threadCallbackFor(t, ['fork'])).toBe("This is the removal of the guard we've been working on — 10 slips across 6 games.");
  });

  it('the evidence clause never inflates a game count: one game / no game / a single slip', () => {
    expect(threadEvidenceClause({ count: 3, games: 1 })).toBe(' — 3 slips in one game');
    expect(threadEvidenceClause({ count: 3, games: 0 })).toBe(' — 3 slips so far');
    expect(threadEvidenceClause({ count: 1, games: 1 })).toBe('');
    expect(threadEvidenceClause({ count: 10, games: 10 })).toBe(' — 10 slips across 10 games');
  });
});

describe('getActiveCoachingThread', () => {
  beforeEach(() => vi.resetModules());

  it('returns the top weakness as the thread, with distinct games and the drill clock', async () => {
    vi.doMock('./weaknessSpine', () => ({
      getUnifiedWeaknessProfile: () => Promise.resolve([
        { tag: 'removal-of-guard', label: 'Removal of the guard', puzzleThemes: ['fork'], total: 4, gameIds: ['g1', 'g2'], lastDrilledAt: null, lastSeenAt: 1000, positions: [], severity: 80, openCount: 3, key: 'k', bucket: 'tactic', sources: ['coach'] },
      ]),
    }));
    const { getActiveCoachingThread } = await import('./coachThread');
    const t = await getActiveCoachingThread();
    expect(t).toMatchObject({ tag: 'removal-of-guard', count: 4, games: 2, drilledAt: null, patternThemes: ['fork'] });
  });

  it('returns null when there is no weakness data yet', async () => {
    vi.doMock('./weaknessSpine', () => ({ getUnifiedWeaknessProfile: () => Promise.resolve([]) }));
    const { getActiveCoachingThread } = await import('./coachThread');
    expect(await getActiveCoachingThread()).toBeNull();
  });

  it('END TO END on the real spine: 10 mistake puzzles across 6 games, no drill → games 6, drilledAt null, count 10', async () => {
    vi.doUnmock('./weaknessSpine');
    await Promise.all([db.games.clear(), db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.classifiedTactics.clear(), db.openingWeakSpots.clear()]);
    // Ten distinct positions (different half-move counters keep the posKey
    // distinct) of the same cluster, spread over six games.
    const base = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1';
    for (let i = 0; i < 10; i++) {
      await db.mistakePuzzles.add(buildMistakePuzzle({
        id: `mp-${i}`,
        fen: `${base} ${i + 2}`,
        playerMoveSan: 'Nc6',
        bestMoveSan: 'Nf6',
        tacticType: 'fork',
        classification: 'blunder',
        sourceGameId: `game-${i % 6}`,
        srsLastReview: null,
        status: 'unsolved',
      }));
    }
    const { getActiveCoachingThread } = await import('./coachThread');
    const t = await getActiveCoachingThread();
    expect(t).not.toBeNull();
    expect(t!.count).toBe(10);
    expect(t!.games).toBe(6);
    expect(t!.drilledAt).toBeNull();
  });
});
