import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/schema';
import {
  FREE_OPENING_POOL,
  FREE_PUZZLE_LIMIT,
  FREE_COACH_LESSON_LIMIT,
  FREE_COACH_CHAT_LIMIT,
  isEligibleFreeOpening,
  loadFreeTier,
  recordPuzzleSolved,
  puzzlesRemaining,
  hasPuzzlesLeft,
  canViewOpening,
  claimFreeOpening,
  kidWindowActive,
  kidDaysLeft,
  stampKidAccess,
  KID_FREE_MS,
  recordCoachLessonUsed,
  coachLessonsRemaining,
  hasCoachLessonsLeft,
  recordCoachChatTurnUsed,
  coachChatTurnsRemaining,
  hasCoachChatTurnsLeft,
  hasCoachAccessLeft,
  recordCoachSpend,
  coachSpendRemaining,
  FREE_COACH_SPEND_LIMIT_USD,
  needsCoachUnlockAnnouncement,
  markCoachUnlockAnnouncementSeen,
} from './freeTierService';

beforeEach(async () => {
  await db.freeTier.clear();
});

describe('FREE_OPENING_POOL', () => {
  it('is the main opening tab + Gambits tab + pro-reps (132 openings)', () => {
    // Widened 2026-08-09 (David: "They can pick an opening from the pro reps
    // or gambits, that's fine") — was 43 (main tab only) before this.
    expect(FREE_OPENING_POOL.size).toBe(132);
  });
  it('includes every opening shown in the main tab — incl. the masterclass gambits', () => {
    for (const id of [
      'italian-game', 'ruy-lopez', 'caro-kann', 'sicilian-najdorf', 'grunfeld-defence', 'qga', 'queens-gambit',
      // gambits that live IN the main opening tab are eligible
      'kings-gambit', 'evans-gambit', 'benko-gambit', 'budapest-gambit', 'albin-countergambit', 'schliemann-defence',
    ]) {
      expect(isEligibleFreeOpening(id)).toBe(true);
    }
  });
  it('includes pro-reps and the separate Gambits-tab courses', () => {
    expect(isEligibleFreeOpening('pro-naroditsky-caro-kann')).toBe(true);
    for (const id of ['scotch-gambit', 'smith-morra-gambit', 'danish-gambit', 'englund-gambit']) {
      expect(isEligibleFreeOpening(id)).toBe(true);
    }
  });
});

describe('puzzle bucket', () => {
  it('starts empty and counts up', async () => {
    expect((await loadFreeTier()).puzzlesSolved).toBe(0);
    await recordPuzzleSolved();
    await recordPuzzleSolved();
    const row = await loadFreeTier();
    expect(row.puzzlesSolved).toBe(2);
    expect(puzzlesRemaining(row)).toBe(FREE_PUZZLE_LIMIT - 2);
    expect(hasPuzzlesLeft(row)).toBe(true);
  });
  it('reports empty at the limit', () => {
    expect(hasPuzzlesLeft({ puzzlesSolved: FREE_PUZZLE_LIMIT })).toBe(false);
    expect(puzzlesRemaining({ puzzlesSolved: FREE_PUZZLE_LIMIT + 5 })).toBe(0);
  });
});

describe('free opening claim', () => {
  it('claims the first eligible opening, then blocks a different one', async () => {
    expect(canViewOpening('italian-game', { freeOpeningId: null })).toBe(true);
    const first = await claimFreeOpening('italian-game');
    expect(first.result).toBe('ok');
    expect(first.row.freeOpeningId).toBe('italian-game');

    const again = await claimFreeOpening('italian-game');
    expect(again.result).toBe('already-claimed-this');

    const other = await claimFreeOpening('caro-kann');
    expect(other.result).toBe('denied-other');
    expect(other.row.freeOpeningId).toBe('italian-game');

    expect(canViewOpening('caro-kann', { freeOpeningId: 'italian-game' })).toBe(false);
  });
  it('claims a Gambits-tab course or a pro-rep opening as the free pick', async () => {
    const gambit = await claimFreeOpening('smith-morra-gambit');
    expect(gambit.result).toBe('ok');
    expect(gambit.row.freeOpeningId).toBe('smith-morra-gambit');
  });
  it('refuses to claim a genuinely non-eligible opening (raw ECO / Counter-Weapons)', async () => {
    const r = await claimFreeOpening('not-a-real-opening-id');
    expect(r.result).toBe('not-eligible');
    expect(r.row.freeOpeningId).toBeNull();
  });
});

describe('loadFreeTier — backfills rows persisted before the coach fields existed', () => {
  it('defaults coachLessonsUsed/coachChatTurnsUsed to 0 for a legacy row', async () => {
    // Simulate a row written before this feature shipped — no coach fields.
    await db.freeTier.put({
      id: 'singleton',
      puzzlesSolved: 3,
      freeOpeningId: 'italian-game',
      kidFirstAccessAt: null,
      updatedAt: 1,
    } as never);
    const row = await loadFreeTier();
    expect(row.coachLessonsUsed).toBe(0);
    expect(row.coachChatTurnsUsed).toBe(0);
    expect(row.puzzlesSolved).toBe(3); // existing fields untouched
  });
});

describe('coach lesson bucket', () => {
  it('starts empty and counts up', async () => {
    expect((await loadFreeTier()).coachLessonsUsed).toBe(0);
    await recordCoachLessonUsed();
    await recordCoachLessonUsed();
    const row = await loadFreeTier();
    expect(row.coachLessonsUsed).toBe(2);
    expect(coachLessonsRemaining(row)).toBe(FREE_COACH_LESSON_LIMIT - 2);
    expect(hasCoachLessonsLeft(row)).toBe(true);
  });
  it('reports empty at the limit', () => {
    expect(hasCoachLessonsLeft({ coachLessonsUsed: FREE_COACH_LESSON_LIMIT })).toBe(false);
    expect(coachLessonsRemaining({ coachLessonsUsed: FREE_COACH_LESSON_LIMIT + 3 })).toBe(0);
  });
});

describe('coach chat-turn bucket', () => {
  it('starts empty and counts up', async () => {
    expect((await loadFreeTier()).coachChatTurnsUsed).toBe(0);
    await recordCoachChatTurnUsed();
    const row = await loadFreeTier();
    expect(row.coachChatTurnsUsed).toBe(1);
    expect(coachChatTurnsRemaining(row)).toBe(FREE_COACH_CHAT_LIMIT - 1);
    expect(hasCoachChatTurnsLeft(row)).toBe(true);
  });
  it('reports empty at the limit', () => {
    expect(hasCoachChatTurnsLeft({ coachChatTurnsUsed: FREE_COACH_CHAT_LIMIT })).toBe(false);
  });
});

describe('coach spend budget — the $1 lifetime gate', () => {
  it('starts at zero and accrues cost', async () => {
    expect((await loadFreeTier()).coachSpendUsd).toBe(0);
    await recordCoachSpend(0.2);
    await recordCoachSpend(0.05);
    const row = await loadFreeTier();
    expect(row.coachSpendUsd).toBeCloseTo(0.25, 6);
    expect(coachSpendRemaining(row)).toBeCloseTo(FREE_COACH_SPEND_LIMIT_USD - 0.25, 6);
  });
  it('ignores non-positive / NaN costs so an unpriced model never advances the gate', async () => {
    await recordCoachSpend(0.1);
    await recordCoachSpend(0);
    await recordCoachSpend(-5);
    await recordCoachSpend(Number.NaN);
    expect((await loadFreeTier()).coachSpendUsd).toBeCloseTo(0.1, 6);
  });
});

describe('coach access — gated on cumulative DeepSeek token cost ($1 lifetime)', () => {
  it('has access with a fresh ledger', () => {
    expect(hasCoachAccessLeft({ coachSpendUsd: 0 })).toBe(true);
  });
  it('keeps access below the $1 limit', () => {
    expect(hasCoachAccessLeft({ coachSpendUsd: 0.5 })).toBe(true);
    expect(hasCoachAccessLeft({ coachSpendUsd: FREE_COACH_SPEND_LIMIT_USD - 0.0001 })).toBe(true);
  });
  it('loses access once spend reaches the $1 limit', () => {
    expect(hasCoachAccessLeft({ coachSpendUsd: FREE_COACH_SPEND_LIMIT_USD })).toBe(false);
    expect(hasCoachAccessLeft({ coachSpendUsd: 2 })).toBe(false);
    expect(coachSpendRemaining({ coachSpendUsd: 2 })).toBe(0);
  });
});

describe('coach-unlock announcement', () => {
  it('needs showing on a fresh ledger', () => {
    expect(needsCoachUnlockAnnouncement({ coachUnlockSeenAt: null })).toBe(true);
  });
  it('needs showing on a legacy row backfilled by loadFreeTier', async () => {
    await db.freeTier.put({
      id: 'singleton',
      puzzlesSolved: 0,
      freeOpeningId: null,
      kidFirstAccessAt: null,
      updatedAt: 1,
    } as never);
    const row = await loadFreeTier();
    expect(needsCoachUnlockAnnouncement(row)).toBe(true);
  });
  it('stops needing it once marked seen, and is idempotent', async () => {
    const seen = await markCoachUnlockAnnouncementSeen();
    expect(seen.coachUnlockSeenAt).toBeTypeOf('number');
    expect(needsCoachUnlockAnnouncement(seen)).toBe(false);
    const first = seen.coachUnlockSeenAt;
    const again = await markCoachUnlockAnnouncementSeen();
    expect(again.coachUnlockSeenAt).toBe(first); // idempotent, doesn't re-stamp
  });
});

describe('kid window', () => {
  it('is active before first access and stamps on first touch', async () => {
    expect(kidWindowActive({ kidFirstAccessAt: null })).toBe(true);
    expect(kidDaysLeft({ kidFirstAccessAt: null })).toBe(7);
    const row = await stampKidAccess();
    expect(row.kidFirstAccessAt).toBeTypeOf('number');
    // idempotent — second stamp keeps the original timestamp
    const first = row.kidFirstAccessAt;
    const row2 = await stampKidAccess();
    expect(row2.kidFirstAccessAt).toBe(first);
  });
  it('expires after 7 days', () => {
    const now = 1_000_000_000_000;
    expect(kidWindowActive({ kidFirstAccessAt: now - (KID_FREE_MS - 1000) }, now)).toBe(true);
    expect(kidWindowActive({ kidFirstAccessAt: now - (KID_FREE_MS + 1000) }, now)).toBe(false);
    expect(kidDaysLeft({ kidFirstAccessAt: now - (KID_FREE_MS + 1000) }, now)).toBe(0);
  });
});
