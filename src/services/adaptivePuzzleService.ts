import { db } from '../db/schema';
import { getWeakestThemes } from './puzzleService';
import { safeRatingKey } from '../utils/ratingKey';
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
  /** When set, always target these themes first (e.g. from Lichess Dashboard). */
  forcedWeakThemes?: string[];
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

export function createAdaptiveSession(
  difficulty: AdaptiveDifficulty,
  forcedWeakThemes?: string[],
  playerPuzzleRating?: number,
): AdaptiveSessionState {
  const config = ADAPTIVE_CONFIGS[difficulty];
  // Seed from the player's REAL puzzle rating when known, clamped into the
  // chosen difficulty's band — so Easy/Medium/Hard still bound the range, but
  // the START matches where the player actually is instead of a fixed constant
  // (David 2026-07-03: a 1900 player picking Medium shouldn't start at 1500).
  // Falls back to the band's nominal start when the rating is unknown.
  const seedRating = typeof playerPuzzleRating === 'number'
    ? Math.min(config.ratingCeiling, Math.max(config.ratingFloor, Math.round(playerPuzzleRating)))
    : config.startRating;
  return {
    difficulty,
    sessionRating: seedRating,
    puzzlesSolved: 0,
    puzzlesFailed: 0,
    streak: 0,
    bestStreak: 0,
    consecutiveWrong: 0,
    ratingHistory: [seedRating],
    weakThemeBoost: false,
    totalPuzzles: 0,
    startedAt: new Date().toISOString(),
    themesEncountered: {},
    forcedWeakThemes: forcedWeakThemes && forcedWeakThemes.length > 0 ? forcedWeakThemes : undefined,
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

/** Multi-move theme tags (≥3 plies of real calculation). David 2026-09-14:
 *  "multi-move sequences are my favorite type and the most beneficial" — the
 *  reach ladder FAVORS these at every level (length is a difficulty signal, not
 *  a ceiling; a 3-mover can be rated 900 or 2200). `long`=3 plies, `veryLong`=5+,
 *  and any forced mate ≥2 is a real sequence. `short`/`oneMove`/`mateIn1` are
 *  the single-shot puzzles we DON'T bias toward. */
export const MULTI_MOVE_THEMES: readonly string[] = [
  'long', 'veryLong', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
];

export function isMultiMovePuzzle(p: Pick<PuzzleRecord, 'themes'>): boolean {
  return p.themes.some((t) => MULTI_MOVE_THEMES.includes(t));
}

export interface NextPuzzleOptions {
  /** Override the selection target (e.g. a boss-spike rating from the reach
   *  controller) instead of session.sessionRating. */
  targetOverride?: number;
  /** Bias selection toward multi-move sequences (the reach ladder default). */
  preferMultiMove?: boolean;
}

/**
 * Fetch the next puzzle for the adaptive session.
 * Considers session rating, seen puzzles, and optional weakness targeting.
 */
export async function getNextAdaptivePuzzle(
  session: AdaptiveSessionState,
  seenIds: Set<string>,
  opts: NextPuzzleOptions = {},
): Promise<PuzzleRecord | null> {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const targetRating = opts.targetOverride ?? session.sessionRating;
  const preferMultiMove = opts.preferMultiMove ?? false;

  // If forced weak themes (from Lichess Dashboard), always target those first
  if (session.forcedWeakThemes && session.forcedWeakThemes.length > 0) {
    for (const theme of session.forcedWeakThemes) {
      const puzzle = await findPuzzleInBand(targetRating, config.bandWidth * 2, seenIds, theme, preferMultiMove);
      if (puzzle) return puzzle;
    }
  } else if (session.weakThemeBoost) {
    // Standard periodic weakness boost using local DB history
    const weakThemes = await getWeakestThemes(3);
    for (const theme of weakThemes) {
      const puzzle = await findPuzzleInBand(targetRating, config.bandWidth, seenIds, theme, preferMultiMove);
      if (puzzle) return puzzle;
    }
  }

  // Standard: find puzzle in rating band, widening if needed
  const bandWidths = [config.bandWidth, config.bandWidth * 2, config.bandWidth * 3];
  for (const bw of bandWidths) {
    const puzzle = await findPuzzleInBand(targetRating, bw, seenIds, undefined, preferMultiMove);
    if (puzzle) return puzzle;
  }

  return null;
}

async function findPuzzleInBand(
  targetRating: number,
  bandWidth: number,
  seenIds: Set<string>,
  theme?: string,
  preferMultiMove = false,
): Promise<PuzzleRecord | null> {
  const r = safeRatingKey(targetRating);
  const min = r - bandWidth;
  const max = r + bandWidth;

  let puzzles = await db.puzzles
    .where('rating')
    .between(min, max)
    .limit(80)
    .toArray();

  // Filter out seen puzzles
  puzzles = puzzles.filter((p) => !seenIds.has(p.id));

  // Filter by theme if specified
  if (theme) {
    puzzles = puzzles.filter((p) => p.themes.includes(theme));
  }

  if (puzzles.length === 0) return null;

  // FAVOR multi-move sequences (David 2026-09-14) — when a healthy multi-move
  // pool exists in-band, draw from it; otherwise fall back to the full pool so
  // selection never starves at a rating where long puzzles are thin.
  let candidates = puzzles;
  if (preferMultiMove) {
    const multi = puzzles.filter(isMultiMovePuzzle);
    if (multi.length >= 3) candidates = multi;
  }

  // Prefer puzzles closer to target rating, with some randomness
  candidates.sort((a, b) => {
    const distA = Math.abs(a.rating - targetRating);
    const distB = Math.abs(b.rating - targetRating);
    return distA - distB;
  });

  // Pick from top 10 closest with random selection for variety
  const pool = candidates.slice(0, Math.min(10, candidates.length));
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
