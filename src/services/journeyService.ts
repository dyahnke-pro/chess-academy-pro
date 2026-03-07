import { db } from '../db/schema';
import {
  JOURNEY_CHAPTER_ORDER,
  type JourneyChapterId,
  type JourneyChapterProgress,
  type JourneyProgress,
  type KidGameId,
} from '../types';

// ─── Meta Key Mapping ────────────────────────────────────────────────────────

function gameMetaKey(gameId: KidGameId): string {
  // Backward compat: 'pawns-journey' maps to existing 'journey_progress'
  if (gameId === 'pawns-journey') return 'journey_progress';
  return `${gameId}_progress`;
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

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

// ─── Game-Aware Functions ────────────────────────────────────────────────────

export async function getGameProgress(gameId: KidGameId): Promise<JourneyProgress | null> {
  const record = await db.meta.get(gameMetaKey(gameId));
  if (!record) return null;
  return JSON.parse(record.value) as JourneyProgress;
}

export async function initGameProgress(
  gameId: KidGameId,
  chapterOrder: readonly JourneyChapterId[],
): Promise<JourneyProgress> {
  const existing = await getGameProgress(gameId);
  if (existing) return existing;

  const progress: JourneyProgress = {
    chapters: {},
    currentChapterId: chapterOrder[0],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  await db.meta.put({ key: gameMetaKey(gameId), value: JSON.stringify(progress) });
  return progress;
}

export async function saveGameProgress(
  gameId: KidGameId,
  progress: JourneyProgress,
): Promise<void> {
  await db.meta.put({ key: gameMetaKey(gameId), value: JSON.stringify(progress) });
}

export async function resetGameProgress(gameId: KidGameId): Promise<void> {
  await db.meta.delete(gameMetaKey(gameId));
}

export function isChapterUnlocked(
  chapterId: JourneyChapterId,
  progress: JourneyProgress,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): boolean {
  const index = chapterOrder.indexOf(chapterId);
  if (index === 0) return true;

  const previousChapterId = chapterOrder[index - 1];
  const previousProgress = progress.chapters[previousChapterId];
  return previousProgress?.completed === true;
}

export function getChapterProgress(
  chapterId: JourneyChapterId,
  progress: JourneyProgress,
): JourneyChapterProgress {
  return progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
}

export async function completeGameLesson(
  gameId: KidGameId,
  chapterId: JourneyChapterId,
  lessonIndex: number,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): Promise<JourneyProgress> {
  let progress = await getGameProgress(gameId);
  if (!progress) {
    progress = await initGameProgress(gameId, chapterOrder);
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.lessonsCompleted = Math.max(chapter.lessonsCompleted, lessonIndex + 1);
  progress.chapters[chapterId] = chapter;

  await saveGameProgress(gameId, progress);
  return progress;
}

export async function recordGamePuzzleAttempt(
  gameId: KidGameId,
  chapterId: JourneyChapterId,
  correct: boolean,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): Promise<JourneyProgress> {
  let progress = await getGameProgress(gameId);
  if (!progress) {
    progress = await initGameProgress(gameId, chapterOrder);
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.puzzlesCompleted += 1;
  if (correct) {
    chapter.puzzlesCorrect += 1;
  }
  progress.chapters[chapterId] = chapter;

  await saveGameProgress(gameId, progress);
  return progress;
}

export async function completeGameChapter(
  gameId: KidGameId,
  chapterId: JourneyChapterId,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): Promise<JourneyProgress> {
  let progress = await getGameProgress(gameId);
  if (!progress) {
    progress = await initGameProgress(gameId, chapterOrder);
  }

  const chapter = progress.chapters[chapterId] ?? createDefaultChapterProgress(chapterId);
  chapter.completed = true;
  chapter.completedAt = new Date().toISOString();
  chapter.bestScore = chapter.puzzlesCorrect;
  progress.chapters[chapterId] = chapter;

  const currentIndex = chapterOrder.indexOf(chapterId);
  if (currentIndex < chapterOrder.length - 1) {
    progress.currentChapterId = chapterOrder[currentIndex + 1];
  }

  await saveGameProgress(gameId, progress);
  return progress;
}

export function getGameCompletedChapterCount(
  progress: JourneyProgress,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): number {
  let count = 0;
  for (const chapterId of chapterOrder) {
    if (progress.chapters[chapterId]?.completed) {
      count += 1;
    }
  }
  return count;
}

export function isGameComplete(
  progress: JourneyProgress,
  chapterOrder: readonly JourneyChapterId[] = JOURNEY_CHAPTER_ORDER,
): boolean {
  return getGameCompletedChapterCount(progress, chapterOrder) === chapterOrder.length;
}

// ─── Backward-Compatible Wrappers (Pawn's Journey) ──────────────────────────

export async function getJourneyProgress(): Promise<JourneyProgress | null> {
  return getGameProgress('pawns-journey');
}

export async function initJourneyProgress(): Promise<JourneyProgress> {
  return initGameProgress('pawns-journey', JOURNEY_CHAPTER_ORDER);
}

export async function saveJourneyProgress(progress: JourneyProgress): Promise<void> {
  return saveGameProgress('pawns-journey', progress);
}

export async function resetJourneyProgress(): Promise<void> {
  return resetGameProgress('pawns-journey');
}

export async function completeLesson(
  chapterId: JourneyChapterId,
  lessonIndex: number,
): Promise<JourneyProgress> {
  return completeGameLesson('pawns-journey', chapterId, lessonIndex);
}

export async function recordPuzzleAttempt(
  chapterId: JourneyChapterId,
  correct: boolean,
): Promise<JourneyProgress> {
  return recordGamePuzzleAttempt('pawns-journey', chapterId, correct);
}

export async function completeChapter(
  chapterId: JourneyChapterId,
): Promise<JourneyProgress> {
  return completeGameChapter('pawns-journey', chapterId);
}

export function getCompletedChapterCount(progress: JourneyProgress): number {
  return getGameCompletedChapterCount(progress);
}

export function isJourneyComplete(progress: JourneyProgress): boolean {
  return isGameComplete(progress);
}
