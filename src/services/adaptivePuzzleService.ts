import { db } from '../db/schema';
import { getWeakestThemes } from './puzzleService';
import type { PuzzleRecord } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdaptiveDifficulty = 'easy' | 'medium' | 'hard';

export interface AdaptiveSessionState {
  difficulty: AdaptiveDifficulty;
  sessionRating: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  streak: number;
  bestStreak: number;
  consecutiveWrong: number;
  ratingHistory: number[];
  weakThemeBoost: boolean;
  totalPuzzles: number;
  startedAt: string;
  themesEncountered: Record<string, { correct: number; total: number }>;
}

export interface AdaptiveConfig {
  startRating: number;
  ratingFloor: number;
  ratingCeiling: number;
  correctBump: number;
  wrongPenalty: number;
  consecutiveWrongExtraPenalty: number;
  weaknessInterval: number;
  bandWidth: number;
}

export interface AdaptiveSessionSummary {
  puzzlesSolved: number;
  puzzlesFailed: number;
  totalPuzzles: number;
  accuracy: number;
  bestStreak: number;
  startRating: number;
  endRating: number;
  ratingHistory: number[];
  weakestThemes: Array<{ theme: string; accuracy: number; total: number }>;
  duration: number; // seconds
}

// ─── Configuration ──────────────────────────────────────────────────────────

export const ADAPTIVE_CONFIGS: Record<AdaptiveDifficulty, AdaptiveConfig> = {
  easy: {
    startRating: 1000,
    ratingFloor: 400,
    ratingCeiling: 1400,
    correctBump: 50,
    wrongPenalty: 30,
    consecutiveWrongExtraPenalty: 20,
    weaknessInterval: 5,
    bandWidth: 150,
  },
  medium: {
    startRating: 1500,
    ratingFloor: 1000,
    ratingCeiling: 2000,
    correctBump: 60,
    wrongPenalty: 35,
    consecutiveWrongExtraPenalty: 25,
    weaknessInterval: 5,
    bandWidth: 150,
  },
  hard: {
    startRating: 2000,
    ratingFloor: 1500,
    ratingCeiling: 2800,
    correctBump: 75,
    wrongPenalty: 40,
    consecutiveWrongExtraPenalty: 30,
    weaknessInterval: 5,
    bandWidth: 200,
  },
};

export const DIFFICULTY_LABELS: Record<AdaptiveDifficulty, { label: string; description: string; ratingRange: string }> = {
  easy: {
    label: 'Easy',
    description: 'Beginner-friendly tactics and simple combinations',
    ratingRange: '~1000',
  },
  medium: {
    label: 'Medium',
    description: 'Intermediate tactics requiring deeper calculation',
    ratingRange: '~1500',
  },
  hard: {
    label: 'Hard',
    description: 'Advanced tactics and complex multi-move combinations',
    ratingRange: '2000+',
  },
};

// ─── Session Management ─────────────────────────────────────────────────────

export function createAdaptiveSession(difficulty: AdaptiveDifficulty): AdaptiveSessionState {
  const config = ADAPTIVE_CONFIGS[difficulty];
  return {
    difficulty,
    sessionRating: config.startRating,
    puzzlesSolved: 0,
    puzzlesFailed: 0,
    streak: 0,
    bestStreak: 0,
    consecutiveWrong: 0,
    ratingHistory: [config.startRating],
    weakThemeBoost: false,
    totalPuzzles: 0,
    startedAt: new Date().toISOString(),
    themesEncountered: {},
  };
}

export function processAdaptiveResult(
  session: AdaptiveSessionState,
  _puzzleRating: number,
  correct: boolean,
  puzzleThemes: string[],
): AdaptiveSessionState {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const next = { ...session };

  // Update theme tracking
  next.themesEncountered = { ...session.themesEncountered };
  for (const theme of puzzleThemes) {
    const prev = next.themesEncountered[theme] ?? { correct: 0, total: 0 };
    next.themesEncountered[theme] = {
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    };
  }

  next.totalPuzzles = session.totalPuzzles + 1;

  if (correct) {
    next.sessionRating = session.sessionRating + config.correctBump;
    next.puzzlesSolved = session.puzzlesSolved + 1;
    next.streak = session.streak + 1;
    next.bestStreak = Math.max(session.bestStreak, next.streak);
    next.consecutiveWrong = 0;
  } else {
    const penalty = config.wrongPenalty + session.consecutiveWrong * config.consecutiveWrongExtraPenalty;
    next.sessionRating = session.sessionRating - penalty;
    next.puzzlesFailed = session.puzzlesFailed + 1;
    next.streak = 0;
    next.consecutiveWrong = session.consecutiveWrong + 1;
  }

  // Clamp rating
  next.sessionRating = Math.max(config.ratingFloor, Math.min(config.ratingCeiling, next.sessionRating));

  // Record history
  next.ratingHistory = [...session.ratingHistory, next.sessionRating];

  // Set weakness boost for every Nth puzzle
  next.weakThemeBoost = next.totalPuzzles % config.weaknessInterval === 0;

  return next;
}

export function getAdaptiveSessionSummary(session: AdaptiveSessionState): AdaptiveSessionSummary {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const durationMs = Date.now() - new Date(session.startedAt).getTime();

  const weakestThemes = Object.entries(session.themesEncountered)
    .filter(([, stats]) => stats.total >= 2)
    .map(([theme, stats]) => ({
      theme,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      total: stats.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return {
    puzzlesSolved: session.puzzlesSolved,
    puzzlesFailed: session.puzzlesFailed,
    totalPuzzles: session.totalPuzzles,
    accuracy: session.totalPuzzles > 0
      ? session.puzzlesSolved / session.totalPuzzles
      : 0,
    bestStreak: session.bestStreak,
    startRating: config.startRating,
    endRating: session.sessionRating,
    ratingHistory: session.ratingHistory,
    weakestThemes,
    duration: Math.round(durationMs / 1000),
  };
}

// ─── Puzzle Selection ───────────────────────────────────────────────────────

/**
 * Fetch the next puzzle for the adaptive session.
 * Considers session rating, seen puzzles, and optional weakness targeting.
 */
export async function getNextAdaptivePuzzle(
  session: AdaptiveSessionState,
  seenIds: Set<string>,
): Promise<PuzzleRecord | null> {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const targetRating = session.sessionRating;

  // If weakness boost, try to find a puzzle matching a weak theme
  if (session.weakThemeBoost) {
    const weakThemes = await getWeakestThemes(3);
    for (const theme of weakThemes) {
      const puzzle = await findPuzzleInBand(targetRating, config.bandWidth, seenIds, theme);
      if (puzzle) return puzzle;
    }
  }

  // Standard: find puzzle in rating band, widening if needed
  const bandWidths = [config.bandWidth, config.bandWidth * 2, config.bandWidth * 3];
  for (const bw of bandWidths) {
    const puzzle = await findPuzzleInBand(targetRating, bw, seenIds);
    if (puzzle) return puzzle;
  }

  return null;
}

async function findPuzzleInBand(
  targetRating: number,
  bandWidth: number,
  seenIds: Set<string>,
  theme?: string,
): Promise<PuzzleRecord | null> {
  const min = targetRating - bandWidth;
  const max = targetRating + bandWidth;

  let puzzles = await db.puzzles
    .where('rating')
    .between(min, max)
    .limit(50)
    .toArray();

  // Filter out seen puzzles
  puzzles = puzzles.filter((p) => !seenIds.has(p.id));

  // Filter by theme if specified
  if (theme) {
    puzzles = puzzles.filter((p) => p.themes.includes(theme));
  }

  if (puzzles.length === 0) return null;

  // Prefer puzzles closer to target rating, with some randomness
  puzzles.sort((a, b) => {
    const distA = Math.abs(a.rating - targetRating);
    const distB = Math.abs(b.rating - targetRating);
    return distA - distB;
  });

  // Pick from top 10 closest with random selection for variety
  const pool = puzzles.slice(0, Math.min(10, puzzles.length));
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
