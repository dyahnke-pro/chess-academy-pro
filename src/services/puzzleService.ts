import { db } from '../db/schema';
import { calculateNextInterval, createDefaultSrsFields } from './srsEngine';
import puzzleData from '../data/puzzles.json';
import type { PuzzleRecord, SrsGrade } from '../types';

// ─── Theme Mapping ──────────────────────────────────────────────────────────

export const TACTICAL_THEMES = [
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'backRankMate',
  'sacrifice',
  'deflection',
  'zugzwang',
  'endgame',
  'openingTrap',
  'mateIn1',
  'mateIn2',
  'mateIn3',
] as const;

export type TacticalTheme = (typeof TACTICAL_THEMES)[number];

/** Maps high-level app themes to Lichess tags. */
export const THEME_MAP: Record<string, string[]> = {
  'Forks':              ['fork'],
  'Pins & Skewers':     ['pin', 'skewer'],
  'Discovered Attacks':  ['discoveredAttack'],
  'Back Rank Mates':     ['backRankMate'],
  'Sacrifices':          ['sacrifice'],
  'Deflection & Decoy':  ['deflection'],
  'Zugzwang':            ['zugzwang'],
  'Endgame Technique':   ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'],
  'Opening Traps':       ['openingTrap'],
  'Mating Nets':         ['mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5', 'smotheredMate', 'hookMate', 'arabianMate', 'anastasiaMate'],
};

// ─── Puzzle Seeding ─────────────────────────────────────────────────────────

interface RawPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | null;
  popularity: number;
  nbPlays: number;
}

const PUZZLE_SEED_KEY = 'puzzles_seeded_v1';

export async function isPuzzleSeeded(): Promise<boolean> {
  const record = await db.meta.get(PUZZLE_SEED_KEY);
  return record?.value === 'true';
}

export async function seedPuzzles(): Promise<void> {
  if (await isPuzzleSeeded()) return;

  const defaults = createDefaultSrsFields();
  const today = new Date().toISOString().split('T')[0];

  const records: PuzzleRecord[] = (puzzleData as RawPuzzle[]).map((p) => ({
    id: p.id,
    fen: p.fen,
    moves: p.moves,
    rating: p.rating,
    themes: p.themes,
    openingTags: p.openingTags,
    popularity: p.popularity,
    nbPlays: p.nbPlays,
    srsInterval: defaults.interval,
    srsEaseFactor: defaults.easeFactor,
    srsRepetitions: defaults.repetitions,
    srsDueDate: today,
    srsLastReview: null,
    userRating: 1200,
    attempts: 0,
    successes: 0,
  }));

  await db.puzzles.bulkPut(records);
  await db.meta.put({ key: PUZZLE_SEED_KEY, value: 'true' });
}

// ─── Adaptive Difficulty ────────────────────────────────────────────────────

const K_FACTOR = 32;

/**
 * ELO-style rating update after a puzzle attempt.
 */
export function calculateRatingDelta(
  userRating: number,
  puzzleRating: number,
  correct: boolean,
): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  const score = correct ? 1 : 0;
  return Math.round(K_FACTOR * (score - expected));
}

/**
 * Updates user's puzzle rating after an attempt.
 */
export function updatePuzzleRating(
  userRating: number,
  puzzleRating: number,
  correct: boolean,
): number {
  return userRating + calculateRatingDelta(userRating, puzzleRating, correct);
}

// ─── Theme Skill Tracking ───────────────────────────────────────────────────

interface ThemeSkill {
  theme: string;
  accuracy: number;
  attempts: number;
}

/**
 * Returns accuracy per theme based on puzzle attempts.
 */
export async function getThemeSkills(): Promise<ThemeSkill[]> {
  const all = await db.puzzles.filter((p) => p.attempts > 0).toArray();

  const themeStats = new Map<string, { correct: number; total: number }>();
  for (const puzzle of all) {
    for (const theme of puzzle.themes) {
      const existing = themeStats.get(theme) ?? { correct: 0, total: 0 };
      existing.total += puzzle.attempts;
      existing.correct += puzzle.successes;
      themeStats.set(theme, existing);
    }
  }

  return Array.from(themeStats.entries())
    .map(([theme, stats]) => ({
      theme,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      attempts: stats.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Returns the themes where the user has the lowest accuracy.
 */
export async function getWeakestThemes(limit: number = 3): Promise<string[]> {
  const skills = await getThemeSkills();
  // Themes never attempted are considered weakest
  const attempted = new Set(skills.map((s) => s.theme));
  const unattempted = TACTICAL_THEMES.filter((t) => !attempted.has(t));

  const weakest = [...unattempted, ...skills.map((s) => s.theme)];
  return weakest.slice(0, limit);
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getPuzzleById(
  id: string,
): Promise<PuzzleRecord | undefined> {
  return db.puzzles.get(id);
}

export async function getPuzzlesByTheme(
  theme: string,
  limit: number = 20,
): Promise<PuzzleRecord[]> {
  const all = await db.puzzles
    .filter((p) => p.themes.includes(theme))
    .limit(limit)
    .toArray();
  return all;
}

/**
 * Returns puzzles in the user's current rating band (+/- 200).
 */
export async function getPuzzlesInRatingBand(
  userRating: number,
  bandWidth: number = 200,
  limit: number = 20,
): Promise<PuzzleRecord[]> {
  const min = userRating - bandWidth;
  const max = userRating + bandWidth;
  return db.puzzles
    .where('rating')
    .between(min, max)
    .limit(limit)
    .toArray();
}

/**
 * Returns puzzles due for SRS review today.
 */
export async function getDuePuzzles(limit: number = 20): Promise<PuzzleRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.puzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

/**
 * Daily puzzle selection algorithm.
 * Prioritizes: SRS due puzzles > weakest theme puzzles > rating band puzzles.
 */
export async function getDailyPuzzles(
  userRating: number,
  count: number = 10,
): Promise<PuzzleRecord[]> {
  const result: PuzzleRecord[] = [];
  const usedIds = new Set<string>();

  // 1. SRS due puzzles (highest priority — 40% of target)
  const dueTarget = Math.ceil(count * 0.4);
  const duePuzzles = await getDuePuzzles(dueTarget);
  for (const p of duePuzzles) {
    if (result.length >= count) break;
    if (!usedIds.has(p.id)) {
      result.push(p);
      usedIds.add(p.id);
    }
  }

  // 2. Weakest theme puzzles (30% of target)
  const themeTarget = Math.ceil(count * 0.3);
  const weakThemes = await getWeakestThemes(3);
  for (const theme of weakThemes) {
    if (result.length >= count) break;
    const themePuzzles = await getPuzzlesByTheme(theme, themeTarget);
    for (const p of themePuzzles) {
      if (result.length >= count) break;
      if (!usedIds.has(p.id)) {
        result.push(p);
        usedIds.add(p.id);
      }
    }
  }

  // 3. Fill remaining from rating band
  if (result.length < count) {
    const bandPuzzles = await getPuzzlesInRatingBand(userRating, 200, count * 2);
    for (const p of bandPuzzles) {
      if (result.length >= count) break;
      if (!usedIds.has(p.id)) {
        result.push(p);
        usedIds.add(p.id);
      }
    }
  }

  return result;
}

// ─── Attempt Recording ──────────────────────────────────────────────────────

export interface AttemptResult {
  correct: boolean;
  newUserRating: number;
  ratingDelta: number;
  newSrsDueDate: string;
}

/**
 * Records a puzzle attempt: updates the puzzle record in Dexie and returns the result.
 */
export async function recordAttempt(
  puzzleId: string,
  correct: boolean,
  userRating: number,
  srsGrade: SrsGrade,
): Promise<AttemptResult | null> {
  const puzzle = await db.puzzles.get(puzzleId);
  if (!puzzle) return null;

  // Update user rating
  const ratingDelta = calculateRatingDelta(userRating, puzzle.rating, correct);
  const newUserRating = userRating + ratingDelta;

  // Calculate SRS scheduling
  const srsResult = calculateNextInterval(
    srsGrade,
    puzzle.srsInterval,
    puzzle.srsEaseFactor,
    puzzle.srsRepetitions,
  );

  // Update puzzle record
  await db.puzzles.update(puzzleId, {
    attempts: puzzle.attempts + 1,
    successes: puzzle.successes + (correct ? 1 : 0),
    userRating: newUserRating,
    srsInterval: srsResult.interval,
    srsEaseFactor: srsResult.easeFactor,
    srsRepetitions: srsResult.repetitions,
    srsDueDate: srsResult.dueDate,
    srsLastReview: new Date().toISOString().split('T')[0],
  });

  return {
    correct,
    newUserRating,
    ratingDelta,
    newSrsDueDate: srsResult.dueDate,
  };
}

// ─── Puzzle Mode Data Support ───────────────────────────────────────────────

export type PuzzleMode = 'standard' | 'timed_blitz' | 'daily_challenge' | 'opening_traps' | 'endgame';

export interface PuzzleModeConfig {
  mode: PuzzleMode;
  label: string;
  description: string;
  timeLimit: number | null; // seconds per puzzle (null = no limit)
  puzzleFilter?: (puzzle: PuzzleRecord) => boolean;
}

export const PUZZLE_MODES: PuzzleModeConfig[] = [
  {
    mode: 'standard',
    label: 'Standard',
    description: 'Solve puzzles at your own pace with SRS scheduling.',
    timeLimit: null,
  },
  {
    mode: 'timed_blitz',
    label: 'Timed Blitz',
    description: '30 seconds per puzzle. How many can you solve?',
    timeLimit: 30,
  },
  {
    mode: 'daily_challenge',
    label: 'Daily Challenge',
    description: 'One carefully selected puzzle per day.',
    timeLimit: null,
  },
  {
    mode: 'opening_traps',
    label: 'Opening Traps',
    description: 'Puzzles tagged to your repertoire openings.',
    timeLimit: null,
    puzzleFilter: (p) => p.themes.includes('openingTrap') || p.openingTags !== null,
  },
  {
    mode: 'endgame',
    label: 'Endgame Scenarios',
    description: 'K+R vs K, K+P vs K, Lucena, Philidor, and more.',
    timeLimit: null,
    puzzleFilter: (p) =>
      p.themes.some((t) =>
        ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'].includes(t),
      ),
  },
];

/**
 * Returns puzzles filtered by mode.
 */
export async function getPuzzlesForMode(
  mode: PuzzleMode,
  userRating: number,
  limit: number = 10,
): Promise<PuzzleRecord[]> {
  const config = PUZZLE_MODES.find((m) => m.mode === mode);
  if (!config) return [];

  if (mode === 'daily_challenge') {
    // One puzzle per day — use today's date as seed for consistent selection
    const today = new Date().toISOString().split('T')[0];
    const all = await db.puzzles.toArray();
    if (all.length === 0) return [];
    // Simple hash-based selection for daily consistency
    const hash = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const idx = hash % all.length;
    return [all[idx]];
  }

  if (config.puzzleFilter) {
    const all = await db.puzzles.filter(config.puzzleFilter).toArray();
    // Sort by closeness to user rating
    return all
      .sort((a, b) => Math.abs(a.rating - userRating) - Math.abs(b.rating - userRating))
      .slice(0, limit);
  }

  return getDailyPuzzles(userRating, limit);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface PuzzleStats {
  totalAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  averageRating: number;
  totalPuzzles: number;
  duePuzzles: number;
}

export async function getPuzzleStats(): Promise<PuzzleStats> {
  const today = new Date().toISOString().split('T')[0];
  const [all, dueCount] = await Promise.all([
    db.puzzles.toArray(),
    db.puzzles.where('srsDueDate').belowOrEqual(today).count(),
  ]);

  const attempted = all.filter((p) => p.attempts > 0);
  const totalAttempts = attempted.reduce((sum, p) => sum + p.attempts, 0);
  const totalCorrect = attempted.reduce((sum, p) => sum + p.successes, 0);

  return {
    totalAttempted: attempted.length,
    totalCorrect,
    overallAccuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
    averageRating: attempted.length > 0
      ? Math.round(attempted.reduce((sum, p) => sum + p.rating, 0) / attempted.length)
      : 0,
    totalPuzzles: all.length,
    duePuzzles: dueCount,
  };
}
