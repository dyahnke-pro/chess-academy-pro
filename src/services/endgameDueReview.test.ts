import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { dueEndgameReviews, endgameReviewPath, tabForLesson } from './endgameDueReview';
import { getPawnEndings } from './endgameLessonsService';
import { rankUpNext, type UpNextInput } from './upNextPicker';

const DAY = 24 * 60 * 60 * 1000;

describe('endgame spaced review, wired (David 2026-10-17)', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a position played once a day ago is due; one played an hour ago is not', async () => {
    const lesson = getPawnEndings()[0];
    await db.endgameProgress.bulkPut([
      { id: 'a', lessonId: lesson.id, fen: 'f1', timesPlayed: 1, lastPlayedAt: Date.now() - 2 * DAY, mastered: false, wrongAttempts: 0 },
      { id: 'b', lessonId: lesson.id, fen: 'f2', timesPlayed: 1, lastPlayedAt: Date.now() - DAY / 24, mastered: false, wrongAttempts: 0 },
    ] as never);
    const due = await dueEndgameReviews();
    expect(due).toMatchObject([{ lessonId: lesson.id, name: lesson.name, tab: 'pawn-endings', dueCount: 1, missed: false }]);
    expect(endgameReviewPath(due[0])).toBe(`/coach/endgame?tab=pawn-endings&lesson=${encodeURIComponent(lesson.id)}`);
  });

  it('an id no catalog knows is never offered', async () => {
    expect(tabForLesson('no-such-lesson')).toBeNull();
    await db.endgameProgress.put({ id: 'x', lessonId: 'no-such-lesson', fen: 'f', timesPlayed: 1, lastPlayedAt: 0, mastered: false, wrongAttempts: 0 } as never);
    expect(await dueEndgameReviews()).toEqual([]);
  });

  it('Up next offers the due lesson, opening it directly', () => {
    const base: UpNextInput = { reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: false, startSteps: [], thinking: null, endgameDue: null, openingHoles: [] };
    const pick = rankUpNext({ ...base, endgameDue: { lessonId: 'opposition', name: 'Opposition', tab: 'pawn-endings', dueCount: 2, missed: false, overdueDays: 0 } }).find((p) => p.kind === 'endgame');
    expect(pick?.label).toBe('Review: Opposition');
    expect(pick?.reason).toBe('2 positions from Opposition are due again. Play one before it fades.');
    expect(pick?.bite).toBe('1 position');
    expect(pick?.path).toBe('/coach/endgame?tab=pawn-endings&lesson=opposition');
    expect(rankUpNext(base).some((p) => p.kind === 'endgame')).toBe(false);
  });
});

describe('the ladder follows the result (David 2026-10-17: "make sure the algo is attached")', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a clean play climbs a rung; a play with mistakes falls to the bottom', async () => {
    const { recordPlay } = await import('./endgameProgressService');
    const { onEndgameReview } = await import('./endgameReviewEvents');
    const rows: { stepBefore: number | null; stepAfter: number | null; intervalDays: number | null }[] = [];
    const off = onEndgameReview((r) => { if (r.event === 'scheduled') rows.push(r); });
    await recordPlay({ lessonId: 'opposition', fen: 'f', firstTryPerfect: true, wrongAttempts: 0 }); // first play: rung 0
    await recordPlay({ lessonId: 'opposition', fen: 'f', firstTryPerfect: true, wrongAttempts: 0 }); // clean: 0 → 1
    await recordPlay({ lessonId: 'opposition', fen: 'f', firstTryPerfect: true, wrongAttempts: 0 }); // clean: 1 → 2
    await recordPlay({ lessonId: 'opposition', fen: 'f', firstTryPerfect: false, wrongAttempts: 2 }); // mistakes: 2 → 0
    off();
    expect(rows.map((r) => [r.stepBefore, r.stepAfter, r.intervalDays])).toEqual([[0, 0, 1], [0, 1, 3], [1, 2, 7], [2, 0, 1]]);
  });

  it('a record from before the rung existed stands on its play-count rung', async () => {
    const { reviewStepOf } = await import('./endgameProgressService');
    expect(reviewStepOf({ timesPlayed: 3 })).toBe(2);
    expect(reviewStepOf({ timesPlayed: 9 })).toBe(4);
    expect(reviewStepOf({ timesPlayed: 9, reviewStep: 0 })).toBe(0);
  });

  it('the rung, not the play count, decides when it is due', async () => {
    const lesson = getPawnEndings()[0];
    await db.endgameProgress.bulkPut([
      // played once, but climbed to rung 3 (16 days): 3 days later it is NOT due
      { id: 'r3', lessonId: lesson.id, fen: 'f1', timesPlayed: 1, lastPlayedAt: Date.now() - 3 * DAY, mastered: true, totalWrongAttempts: 0, reviewStep: 3 },
      // played many times, but fell to rung 0 on a mistake: 2 days later it IS
      { id: 'r0', lessonId: lesson.id, fen: 'f2', timesPlayed: 6, lastPlayedAt: Date.now() - 2 * DAY, mastered: false, totalWrongAttempts: 4, reviewStep: 0 },
    ] as never);
    expect((await dueEndgameReviews())[0]?.dueCount).toBe(1);
  });
});
