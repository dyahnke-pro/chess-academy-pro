import { db } from '../db/schema';
import { createDefaultSrsFields } from './srsEngine';
import { DEFAULT_THEME_ID } from './themeService';
import type { UserProfile, PuzzleRecord, OpeningRecord, SessionRecord, FlashcardRecord } from '../types';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getOrCreateMainProfile(): Promise<UserProfile> {
  const existing = await db.profiles.get('main');
  if (existing) return existing;

  const defaultProfile: UserProfile = {
    id: 'main',
    name: 'Player',
    isKidMode: false,
    currentRating: 1420,
    puzzleRating: 1400,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    achievements: [],
    skillRadar: {
      opening: 50,
      tactics: 50,
      endgame: 50,
      memory: 50,
      calculation: 50,
    },
    badHabits: [],
    preferences: {
      theme: DEFAULT_THEME_ID,
      boardColor: 'classic',
      pieceSet: 'staunton',
      showEvalBar: true,
      showEngineLines: false,
      soundEnabled: true,
      voiceEnabled: true,
      dailySessionMinutes: 45,
      aiProvider: 'deepseek',
      apiKeyEncrypted: null,
      apiKeyIv: null,
      anthropicApiKeyEncrypted: null,
      anthropicApiKeyIv: null,
      preferredModel: {
        commentary: 'deepseek-chat',
        analysis: 'deepseek-reasoner',
        reports: 'deepseek-reasoner',
      },
      monthlyBudgetCap: null,
      estimatedSpend: 0,
      elevenlabsKeyEncrypted: null,
      elevenlabsKeyIv: null,
      elevenlabsVoiceId: null,
      voiceSpeed: 1.0,
      highlightLastMove: true,
      showLegalMoves: true,
      showCoordinates: true,
      pieceAnimationSpeed: 'medium' as const,
      boardOrientation: true,
      moveQualityFlash: false,
      showHints: true,
      moveMethod: 'both' as const,
      moveConfirmation: false,
      autoPromoteQueen: true,
      masterAllOff: false,
    },
  };

  await db.profiles.add(defaultProfile);
  return defaultProfile;
}

export async function updateProfile(
  id: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  await db.profiles.update(id, updates);
}

// ─── Puzzles ──────────────────────────────────────────────────────────────────

export async function getDuePuzzles(limit: number = 20): Promise<PuzzleRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.puzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

export async function updatePuzzleSrs(
  id: string,
  srsData: Pick<PuzzleRecord, 'srsInterval' | 'srsEaseFactor' | 'srsRepetitions' | 'srsDueDate' | 'srsLastReview'>,
): Promise<void> {
  await db.puzzles.update(id, srsData);
}

export async function recordPuzzleAttempt(
  id: string,
  correct: boolean,
): Promise<void> {
  const puzzle = await db.puzzles.get(id);
  if (!puzzle) return;

  await db.puzzles.update(id, {
    attempts: puzzle.attempts + 1,
    successes: correct ? puzzle.successes + 1 : puzzle.successes,
  });
}

// ─── Openings ─────────────────────────────────────────────────────────────────

export async function getRepertoireOpenings(): Promise<OpeningRecord[]> {
  return db.openings.filter((o) => o.isRepertoire).toArray();
}

export async function getOpeningById(id: string): Promise<OpeningRecord | undefined> {
  return db.openings.get(id);
}

export async function updateOpeningProgress(
  id: string,
  accuracy: number,
): Promise<void> {
  const opening = await db.openings.get(id);
  if (!opening) return;

  await db.openings.update(id, {
    drillAttempts: opening.drillAttempts + 1,
    drillAccuracy: (opening.drillAccuracy * opening.drillAttempts + accuracy) / (opening.drillAttempts + 1),
    lastStudied: new Date().toISOString(),
  });
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export async function getDueFlashcards(limit: number = 20): Promise<FlashcardRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.flashcards
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

export async function updateFlashcardSrs(
  id: string,
  srsData: Pick<FlashcardRecord, 'srsInterval' | 'srsEaseFactor' | 'srsRepetitions' | 'srsDueDate' | 'srsLastReview'>,
): Promise<void> {
  await db.flashcards.update(id, srsData);
}

export async function generateFlashcardsForOpening(
  openingId: string,
): Promise<void> {
  const opening = await db.openings.get(openingId);
  if (!opening?.variations) return;

  const existing = await db.flashcards.where('openingId').equals(openingId).count();
  if (existing > 0) return; // Already generated

  const srsDefaults = createDefaultSrsFields();
  const cards: FlashcardRecord[] = opening.variations.map((variation, i) => ({
    id: `${openingId}-card-${i}`,
    openingId,
    type: 'best_move' as const,
    questionFen: opening.fen,
    questionText: `What is the key idea in the ${variation.name}?`,
    answerMove: null,
    answerText: variation.explanation,
    srsInterval: srsDefaults.interval,
    srsEaseFactor: srsDefaults.easeFactor,
    srsRepetitions: srsDefaults.repetitions,
    srsDueDate: srsDefaults.dueDate,
    srsLastReview: null,
  }));

  await db.flashcards.bulkAdd(cards);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(session: SessionRecord): Promise<void> {
  await db.sessions.add(session);
}

export async function updateSession(
  id: string,
  updates: Partial<SessionRecord>,
): Promise<void> {
  await db.sessions.update(id, updates);
}

export async function getRecentSessions(limit: number = 30): Promise<SessionRecord[]> {
  return db.sessions
    .orderBy('date')
    .reverse()
    .limit(limit)
    .toArray();
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportUserData(): Promise<string> {
  const [profiles, sessions, openings, flashcards] = await Promise.all([
    db.profiles.toArray(),
    db.sessions.toArray(),
    db.openings.filter((o) => o.isRepertoire).toArray(),
    db.flashcards.toArray(),
  ]);

  return JSON.stringify({ profiles, sessions, openings, flashcards }, null, 2);
}
