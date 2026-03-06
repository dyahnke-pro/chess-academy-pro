import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { JOURNEY_CHAPTER_ORDER } from '../types';
import type { JourneyChapterId, JourneyProgress } from '../types';
import {
  getJourneyProgress,
  initJourneyProgress,
  saveJourneyProgress,
  resetJourneyProgress,
  isChapterUnlocked,
  getChapterProgress,
  completeLesson,
  recordPuzzleAttempt,
  completeChapter,
  getCompletedChapterCount,
  isJourneyComplete,
} from './journeyService';

function createProgressWithCompletedChapter(
  chapterId: JourneyChapterId,
  overrides: Partial<JourneyProgress> = {},
): JourneyProgress {
  return {
    chapters: {
      [chapterId]: {
        chapterId,
        lessonsCompleted: 3,
        puzzlesCompleted: 5,
        puzzlesCorrect: 4,
        completed: true,
        bestScore: 4,
        completedAt: '2026-03-01T00:00:00.000Z',
      },
    },
    currentChapterId: 'rook',
    startedAt: '2026-03-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('journeyService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('getJourneyProgress', () => {
    it('returns null when no progress exists', async () => {
      const result = await getJourneyProgress();
      expect(result).toBeNull();
    });
  });

  describe('initJourneyProgress', () => {
    it('creates fresh progress with pawn as current chapter', async () => {
      const progress = await initJourneyProgress();

      expect(progress.currentChapterId).toBe('pawn');
      expect(progress.chapters).toEqual({});
      expect(progress.startedAt).toBeTruthy();
      expect(progress.completedAt).toBeNull();
    });

    it('calling twice does not overwrite existing progress', async () => {
      const first = await initJourneyProgress();
      const startedAt = first.startedAt;

      // Modify progress before second call
      first.currentChapterId = 'rook';
      await saveJourneyProgress(first);

      const second = await initJourneyProgress();
      expect(second.currentChapterId).toBe('rook');
      expect(second.startedAt).toBe(startedAt);
    });
  });

  describe('saveJourneyProgress + getJourneyProgress', () => {
    it('round-trips save and load correctly', async () => {
      const progress: JourneyProgress = {
        chapters: {
          pawn: {
            chapterId: 'pawn',
            lessonsCompleted: 2,
            puzzlesCompleted: 3,
            puzzlesCorrect: 2,
            completed: false,
            bestScore: 0,
            completedAt: null,
          },
        },
        currentChapterId: 'pawn',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: null,
      };

      await saveJourneyProgress(progress);
      const loaded = await getJourneyProgress();

      expect(loaded).toEqual(progress);
    });
  });

  describe('resetJourneyProgress', () => {
    it('clears progress back to null', async () => {
      await initJourneyProgress();
      const before = await getJourneyProgress();
      expect(before).not.toBeNull();

      await resetJourneyProgress();
      const after = await getJourneyProgress();
      expect(after).toBeNull();
    });
  });

  describe('isChapterUnlocked', () => {
    it('pawn is always unlocked', () => {
      const progress: JourneyProgress = {
        chapters: {},
        currentChapterId: 'pawn',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: null,
      };

      expect(isChapterUnlocked('pawn', progress)).toBe(true);
    });

    it('rook is unlocked after pawn completed', () => {
      const progress = createProgressWithCompletedChapter('pawn');

      expect(isChapterUnlocked('rook', progress)).toBe(true);
    });

    it('bishop is locked when rook is not completed', () => {
      const progress = createProgressWithCompletedChapter('pawn');

      expect(isChapterUnlocked('bishop', progress)).toBe(false);
    });
  });

  describe('getChapterProgress', () => {
    it('returns defaults for unstarted chapter', () => {
      const progress: JourneyProgress = {
        chapters: {},
        currentChapterId: 'pawn',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: null,
      };

      const chapter = getChapterProgress('pawn', progress);
      expect(chapter.chapterId).toBe('pawn');
      expect(chapter.lessonsCompleted).toBe(0);
      expect(chapter.puzzlesCompleted).toBe(0);
      expect(chapter.puzzlesCorrect).toBe(0);
      expect(chapter.completed).toBe(false);
      expect(chapter.bestScore).toBe(0);
      expect(chapter.completedAt).toBeNull();
    });

    it('returns saved progress for started chapter', () => {
      const progress = createProgressWithCompletedChapter('pawn');

      const chapter = getChapterProgress('pawn', progress);
      expect(chapter.chapterId).toBe('pawn');
      expect(chapter.lessonsCompleted).toBe(3);
      expect(chapter.puzzlesCompleted).toBe(5);
      expect(chapter.puzzlesCorrect).toBe(4);
      expect(chapter.completed).toBe(true);
      expect(chapter.bestScore).toBe(4);
      expect(chapter.completedAt).toBe('2026-03-01T00:00:00.000Z');
    });
  });

  describe('completeLesson', () => {
    it('increments lessonsCompleted', async () => {
      await initJourneyProgress();

      const updated = await completeLesson('pawn', 0);
      const chapter = updated.chapters['pawn'];
      expect(chapter?.lessonsCompleted).toBe(1);

      const updated2 = await completeLesson('pawn', 1);
      const chapter2 = updated2.chapters['pawn'];
      expect(chapter2?.lessonsCompleted).toBe(2);
    });

    it('initializes progress if none exists', async () => {
      const before = await getJourneyProgress();
      expect(before).toBeNull();

      const updated = await completeLesson('pawn', 0);
      expect(updated.currentChapterId).toBe('pawn');
      expect(updated.chapters['pawn']?.lessonsCompleted).toBe(1);

      const saved = await getJourneyProgress();
      expect(saved).not.toBeNull();
    });

    it('does not decrement lessonsCompleted (uses Math.max)', async () => {
      await initJourneyProgress();

      await completeLesson('pawn', 2);
      const progress1 = await getJourneyProgress();
      expect(progress1?.chapters['pawn']?.lessonsCompleted).toBe(3);

      // Completing an earlier lesson should not reduce the count
      await completeLesson('pawn', 0);
      const progress2 = await getJourneyProgress();
      expect(progress2?.chapters['pawn']?.lessonsCompleted).toBe(3);
    });
  });

  describe('recordPuzzleAttempt', () => {
    it('increments puzzlesCompleted and puzzlesCorrect on correct answer', async () => {
      await initJourneyProgress();

      const updated = await recordPuzzleAttempt('pawn', true);
      const chapter = updated.chapters['pawn'];
      expect(chapter?.puzzlesCompleted).toBe(1);
      expect(chapter?.puzzlesCorrect).toBe(1);
    });

    it('wrong answer only increments puzzlesCompleted', async () => {
      await initJourneyProgress();

      const updated = await recordPuzzleAttempt('pawn', false);
      const chapter = updated.chapters['pawn'];
      expect(chapter?.puzzlesCompleted).toBe(1);
      expect(chapter?.puzzlesCorrect).toBe(0);
    });
  });

  describe('completeChapter', () => {
    it('sets completed, completedAt, and bestScore', async () => {
      await initJourneyProgress();

      // Record some puzzle attempts first
      await recordPuzzleAttempt('pawn', true);
      await recordPuzzleAttempt('pawn', true);
      await recordPuzzleAttempt('pawn', false);

      const updated = await completeChapter('pawn');
      const chapter = updated.chapters['pawn'];
      expect(chapter?.completed).toBe(true);
      expect(chapter?.completedAt).toBeTruthy();
      expect(chapter?.bestScore).toBe(2); // puzzlesCorrect = 2
    });

    it('advances currentChapterId to next chapter', async () => {
      await initJourneyProgress();

      const updated = await completeChapter('pawn');
      expect(updated.currentChapterId).toBe('rook');
    });

    it('last chapter does not advance past first-game', async () => {
      await initJourneyProgress();

      // Complete all chapters up through first-game
      for (const chapterId of JOURNEY_CHAPTER_ORDER) {
        await completeChapter(chapterId);
      }

      const progress = await getJourneyProgress();
      expect(progress?.currentChapterId).toBe('first-game');
    });
  });

  describe('getCompletedChapterCount', () => {
    it('counts completed chapters correctly', () => {
      const progress: JourneyProgress = {
        chapters: {
          pawn: {
            chapterId: 'pawn',
            lessonsCompleted: 3,
            puzzlesCompleted: 5,
            puzzlesCorrect: 4,
            completed: true,
            bestScore: 4,
            completedAt: '2026-03-01T00:00:00.000Z',
          },
          rook: {
            chapterId: 'rook',
            lessonsCompleted: 2,
            puzzlesCompleted: 3,
            puzzlesCorrect: 2,
            completed: true,
            bestScore: 2,
            completedAt: '2026-03-02T00:00:00.000Z',
          },
          bishop: {
            chapterId: 'bishop',
            lessonsCompleted: 1,
            puzzlesCompleted: 0,
            puzzlesCorrect: 0,
            completed: false,
            bestScore: 0,
            completedAt: null,
          },
        },
        currentChapterId: 'bishop',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: null,
      };

      expect(getCompletedChapterCount(progress)).toBe(2);
    });
  });

  describe('isJourneyComplete', () => {
    it('returns false when not all chapters completed', () => {
      const progress: JourneyProgress = {
        chapters: {
          pawn: {
            chapterId: 'pawn',
            lessonsCompleted: 3,
            puzzlesCompleted: 5,
            puzzlesCorrect: 4,
            completed: true,
            bestScore: 4,
            completedAt: '2026-03-01T00:00:00.000Z',
          },
        },
        currentChapterId: 'rook',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: null,
      };

      expect(isJourneyComplete(progress)).toBe(false);
    });

    it('returns true when all 8 chapters completed', () => {
      const chapters: JourneyProgress['chapters'] = {};
      for (const chapterId of JOURNEY_CHAPTER_ORDER) {
        chapters[chapterId] = {
          chapterId,
          lessonsCompleted: 3,
          puzzlesCompleted: 5,
          puzzlesCorrect: 4,
          completed: true,
          bestScore: 4,
          completedAt: '2026-03-01T00:00:00.000Z',
        };
      }

      const progress: JourneyProgress = {
        chapters,
        currentChapterId: 'first-game',
        startedAt: '2026-03-01T00:00:00.000Z',
        completedAt: '2026-03-08T00:00:00.000Z',
      };

      expect(isJourneyComplete(progress)).toBe(true);
    });
  });
});
