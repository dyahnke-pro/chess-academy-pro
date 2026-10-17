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
    expect(due).toEqual([{ lessonId: lesson.id, name: lesson.name, tab: 'pawn-endings', dueCount: 1 }]);
    expect(endgameReviewPath(due[0])).toBe(`/coach/endgame?tab=pawn-endings&lesson=${encodeURIComponent(lesson.id)}`);
  });

  it('an id no catalog knows is never offered', async () => {
    expect(tabForLesson('no-such-lesson')).toBeNull();
    await db.endgameProgress.put({ id: 'x', lessonId: 'no-such-lesson', fen: 'f', timesPlayed: 1, lastPlayedAt: 0, mastered: false, wrongAttempts: 0 } as never);
    expect(await dueEndgameReviews()).toEqual([]);
  });

  it('Up next offers the due lesson, opening it directly', () => {
    const base: UpNextInput = { reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: false, startSteps: [], thinking: null, endgameDue: null };
    const pick = rankUpNext({ ...base, endgameDue: { lessonId: 'opposition', name: 'Opposition', tab: 'pawn-endings', dueCount: 2 } }).find((p) => p.kind === 'endgame');
    expect(pick?.label).toBe('Review: Opposition');
    expect(pick?.reason).toBe('2 positions from Opposition are due again. Play them before they fade.');
    expect(pick?.path).toBe('/coach/endgame?tab=pawn-endings&lesson=opposition');
    expect(rankUpNext(base).some((p) => p.kind === 'endgame')).toBe(false);
  });
});
