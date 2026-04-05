import { db } from '../db/schema';
import { calculateNextInterval, createDefaultSrsFields } from './srsEngine';
import { getMistakePuzzlesDue } from './mistakePuzzleService';
import puzzleData from '../data/puzzles.json';
import type { PuzzleRecord, SrsGrade, CoachDifficulty, MistakePuzzle } from '../types';

// ─── Shuffle Utility ───────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new shuffled copy of the array. */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Fisher-Yates shuffle — mutates the array in place and returns it. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
  'Opening Traps':       ['opening', 'trappedPiece', 'hangingPiece'],
  'Forks':              ['fork'],
  'Pins & Skewers':     ['pin', 'skewer'],
  'Discovered Attacks':  ['discoveredAttack'],
  'Back Rank Mates':     ['backRankMate'],
  'Sacrifices':          ['sacrifice'],
  'Deflection & Decoy':  ['deflection'],
  'Zugzwang':            ['zugzwang'],
  'Endgame Technique':   ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'],
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

const PUZZLE_SEED_KEY = 'puzzles_seeded_v2';

export async function isPuzzleSeeded(): Promise<boolean> {
  const record = await db.meta.get(PUZZLE_SEED_KEY);
  return record?.value === 'true';
}

export async function seedPuzzles(): Promise<void> {
  if (await isPuzzleSeeded()) return;

  const defaults = createDefaultSrsFields();
  const today = new Date().toISOString().split('T')[0];

  // Get existing puzzle IDs to preserve SRS progress
  const existingIds = new Set(await db.puzzles.toCollection().primaryKeys());

  const records: PuzzleRecord[] = (puzzleData as RawPuzzle[])
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
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

  if (records.length > 0) {
    await db.puzzles.bulkAdd(records);
  }
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

export interface ThemeSkill {
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
  const candidates = await db.puzzles
    .where('rating')
    .between(min, max)
    .toArray();
  return shuffle(candidates).slice(0, limit);
}

/**
 * Returns puzzles due for SRS review today.
 */
export async function getDuePuzzles(limit: number = 20): Promise<PuzzleRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  const candidates = await db.puzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .toArray();
  return shuffle(candidates).slice(0, limit);
}

/**
 * Adapts a MistakePuzzle to PuzzleRecord shape for the unified puzzle queue.
 * Tagged with openingTags: 'mistake' so the UI can show a "From your game" badge.
 */
export function mistakePuzzleToPuzzleRecord(mp: MistakePuzzle): PuzzleRecord {
  return {
    id: mp.id,
    fen: mp.fen,
    moves: mp.moves,
    rating: 1200,
    themes: [mp.classification],
    openingTags: 'mistake',
    popularity: 0,
    nbPlays: 0,
    srsInterval: mp.srsInterval,
    srsEaseFactor: mp.srsEaseFactor,
    srsRepetitions: mp.srsRepetitions,
    srsDueDate: mp.srsDueDate,
    srsLastReview: mp.srsLastReview,
    userRating: 1200,
    attempts: mp.attempts,
    successes: mp.successes,
  };
}

/**
 * Daily puzzle selection algorithm.
 * Prioritizes: mistake puzzles > SRS due > weakest themes > rating band.
 */
export async function getDailyPuzzles(
  userRating: number,
  count: number = 10,
): Promise<PuzzleRecord[]> {
  const result: PuzzleRecord[] = [];
  const usedIds = new Set<string>();

  // 1. Mistake puzzles (priority — 20% of target)
  const mistakeTarget = Math.ceil(count * 0.2);
  const dueMistakes = await getMistakePuzzlesDue(mistakeTarget);
  for (const mp of dueMistakes) {
    if (result.length >= count) break;
    if (!usedIds.has(mp.id)) {
      result.push(mistakePuzzleToPuzzleRecord(mp));
      usedIds.add(mp.id);
    }
  }

  // 2. SRS due puzzles (35% of target)
  const dueTarget = Math.ceil(count * 0.35);
  const duePuzzles = await getDuePuzzles(dueTarget);
  for (const p of duePuzzles) {
    if (result.length >= count) break;
    if (!usedIds.has(p.id)) {
      result.push(p);
      usedIds.add(p.id);
    }
  }

  // 3. Weakest theme puzzles (25% of target)
  const themeTarget = Math.ceil(count * 0.25);
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

  // 4. Fill remaining from rating band
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
    const all = await db.puzzles.orderBy('id').toArray();
    if (all.length === 0) return [];
    // Stable hash: use character codes × position to avoid collisions
    const hash = today.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
    const idx = hash % all.length;
    return [all[idx]];
  }

  if (config.puzzleFilter) {
    const all = await db.puzzles.filter(config.puzzleFilter).toArray();
    // Shuffle within a reasonable rating band for variety, then trim
    const band = all.filter((p) => Math.abs(p.rating - userRating) <= 300);
    const pool = band.length >= limit ? band : all;
    return shuffle(pool).slice(0, limit);
  }

  return getDailyPuzzles(userRating, limit);
}

// ─── Kid Mode Puzzles ────────────────────────────────────────────────────────

interface KidDifficultyBracket {
  minRating: number;
  maxRating: number;
}

export const KID_DIFFICULTY_BRACKETS: Record<CoachDifficulty, KidDifficultyBracket> = {
  easy:   { minRating: 0,    maxRating: 799  },
  medium: { minRating: 800,  maxRating: 1099 },
  hard:   { minRating: 1100, maxRating: 1399 },
};

/**
 * Returns puzzles for kid mode filtered by difficulty bracket.
 * Prioritizes unattempted puzzles and shuffles results for variety.
 */
export async function getKidPuzzles(
  difficulty: CoachDifficulty,
  limit: number = 10,
): Promise<PuzzleRecord[]> {
  const bracket = KID_DIFFICULTY_BRACKETS[difficulty];
  const puzzles = await db.puzzles
    .where('rating')
    .between(bracket.minRating, bracket.maxRating, true, true)
    .toArray();

  // Sort so unattempted puzzles come first, then least-attempted
  const sorted = puzzles.sort((a, b) => a.attempts - b.attempts);

  // Take a pool and shuffle for variety
  const pool = sorted.slice(0, Math.min(limit * 3, sorted.length));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit);
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
