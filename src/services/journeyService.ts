import { db } from '../db/schema';
import {
  JOURNEY_CHAPTER_ORDER,
  type JourneyChapterId,
  type JourneyChapterProgress,
  type JourneyProgress,
} from '../types';

const JOURNEY_PROGRESS_KEY = 'journey_progress';

function createDefaultChapterProgress(chapterId: JourneyChapterId): JourneyChapterProgress {
  return {
    chapterId,
    lessonsCompleted: 0,
    puzzlesCompleted: 0,
    puzzlesCorrect: 0,
    completed: false,
    bestScore: 0,
    completedAt: null,
  };
}

export async function getJourneyProgress(): Promise<JourneyProgress | null> {
  const record = await db.meta.get(JOURNEY_PROGRESS_KEY);
  if (!record) return null;
  return JSON.parse(record.value) as JourneyProgress;
}

export async function initJourneyProgress(): Promise<JourneyProgress> {
  const existing = await getJourneyProgress();
  if (existing) return existing;

  const progress: JourneyProgress = {
    chapters: {},
    currentChapterId: 'pawn',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  await db.meta.put({ key: JOURNEY_PROGRESS_KEY, value: JSON.stringify(progress) });
  return progress;
}

export async function saveJourneyProgress(progress: JourneyProgress): Promise<void> {
  await db.meta.put({ key: JOURNEY_PROGRESS_KEY, value: JSON.stringify(progress) });
}

export async function resetJourneyProgress(): Promise<void> {
  await db.meta.delete(JOURNEY_PROGRESS_KEY);
}

export function isChapterUnlocked(
  chapterId: JourneyChapterId,
  progress: JourneyProgress,
): boolean {
  const index = JOURNEY_CHAPTER_ORDER.indexOf(chapterId);
  if (index === 0) return true;

  const previousChapterId = JOURNEY_CHAPTER_ORDER[index - 1];
  const previousProgress = progress.chapters[previousChapterId];
  return previousProgress?.completed === true;
}

export function getChapterProgress(
  chapterId: JourneyChapterId,
  progress: JourneyProgress,
): JourneyChapterProgress {
  return progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
}

export async function completeLesson(
  chapterId: JourneyChapterId,
  lessonIndex: number,
): Promise<JourneyProgress> {
  let progress = await getJourneyProgress();
  if (!progress) {
    progress = await initJourneyProgress();
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.lessonsCompleted = Math.max(chapter.lessonsCompleted, lessonIndex + 1);
  progress.chapters[chapterId] = chapter;

  await saveJourneyProgress(progress);
  return progress;
}

export async function recordPuzzleAttempt(
  chapterId: JourneyChapterId,
  correct: boolean,
): Promise<JourneyProgress> {
  let progress = await getJourneyProgress();
  if (!progress) {
    progress = await initJourneyProgress();
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.puzzlesCompleted += 1;
  if (correct) {
    chapter.puzzlesCorrect += 1;
  }
  progress.chapters[chapterId] = chapter;

  await saveJourneyProgress(progress);
  return progress;
}

export async function completeChapter(
  chapterId: JourneyChapterId,
): Promise<JourneyProgress> {
  let progress = await getJourneyProgress();
  if (!progress) {
    progress = await initJourneyProgress();
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.completed = true;
  chapter.completedAt = new Date().toISOString();
  chapter.bestScore = chapter.puzzlesCorrect;
  progress.chapters[chapterId] = chapter;

  const currentIndex = JOURNEY_CHAPTER_ORDER.indexOf(chapterId);
  if (currentIndex < JOURNEY_CHAPTER_ORDER.length - 1) {
    progress.currentChapterId = JOURNEY_CHAPTER_ORDER[currentIndex + 1];
  }

  await saveJourneyProgress(progress);
  return progress;
}

export function getCompletedChapterCount(progress: JourneyProgress): number {
  let count = 0;
  for (const chapterId of JOURNEY_CHAPTER_ORDER) {
    if (progress.chapters[chapterId]?.completed) {
      count += 1;
    }
  }
  return count;
}

export function isJourneyComplete(progress: JourneyProgress): boolean {
  return getCompletedChapterCount(progress) === JOURNEY_CHAPTER_ORDER.length;
}
