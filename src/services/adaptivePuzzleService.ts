import { db } from '../db/schema';
import { getWeakestThemes, puzzleForeground } from './puzzleService';
import { safeRatingKey } from '../utils/ratingKey';
import type { PuzzleRecord } from '../types';
import { solverMoves, ONE_MOVER_CEILING } from './puzzleDepth';
import type { PuzzleDifficulty } from './studentPuzzleRating';

// ─── Types ──────────────────────────────────────────────────────────────────

/** One vocabulary: the difficulty the cards offer IS the one the target
 *  offset table (`DIFFICULTY_OFFSET`) is keyed on. */
export type AdaptiveDifficulty = PuzzleDifficulty;

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

/** What each card SAYS. The number on the card is computed per student
 *  (`puzzleTarget` + `DIFFICULTY_OFFSET`) — the fixed "~1000 / ~1500 / 2000+"
 *  bands this replaced were never consulted by selection, so Medium "~1500"
 *  served a 997 to a new student (hand walk 2026-10-04, D11). */
export const DIFFICULTY_LABELS: Record<AdaptiveDifficulty, { label: string; description: string; relation: string }> = {
  easy: {
    label: 'Easy',
    description: 'Clean reps below your training level',
    relation: 'A step easier',
  },
  medium: {
    label: 'Medium',
    description: 'Your training level — it climbs as you solve',
    relation: 'Your training level',
  },
  hard: {
    label: 'Hard',
    description: 'A real fight above your training level',
    relation: 'A step harder',
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
    // The FIRST puzzle consults the student's record too: a student with an
    // open hole starts on it, and a new student starts on a grey theme in
    // rotation. After that, every `weaknessInterval` puzzles.
    weakThemeBoost: true,
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
/** A puzzle the solver plays two or more moves in — COUNTED off the line
 *  (`solverMoves`), never read off Lichess's theme tags, which file every
 *  two-move `short` puzzle as a one-mover. */
export function isMultiMovePuzzle(p: Pick<PuzzleRecord, 'moves' | 'source'>): boolean {
  return solverMoves(p) >= 2;
}

export interface NextPuzzleOptions {
  /** Override the selection target (e.g. a boss-spike rating from the reach
   *  controller) instead of session.sessionRating. */
  targetOverride?: number;
  /** Bias selection toward multi-move sequences (the reach ladder default).
   *  Below ONE_MOVER_CEILING the bias is off — one-movers are fair there. */
  preferMultiMove?: boolean;
  /** Hard depth window in solver moves (the Long tab, deep-run). A puzzle
   *  outside it is never served. */
  depth?: { min: number; max: number };
}

/**
 * Fetch the next puzzle for the adaptive session.
 * Considers session rating, seen puzzles, and optional weakness targeting.
 */
export function getNextAdaptivePuzzle(
  session: AdaptiveSessionState,
  seenIds: Set<string>,
  opts: NextPuzzleOptions = {},
): Promise<PuzzleRecord | null> {
  // A student is waiting on this: the boot-time seed steps aside for it.
  return puzzleForeground(selectNextAdaptivePuzzle(session, seenIds, opts));
}

async function selectNextAdaptivePuzzle(
  session: AdaptiveSessionState,
  seenIds: Set<string>,
  opts: NextPuzzleOptions,
): Promise<PuzzleRecord | null> {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const targetRating = opts.targetOverride ?? session.sessionRating;
  const pick: SelectionPick = {
    preferMultiMove: (opts.preferMultiMove ?? false) && targetRating >= ONE_MOVER_CEILING,
    depth: opts.depth,
  };

  // If forced weak themes (from Lichess Dashboard), always target those first
  if (session.forcedWeakThemes && session.forcedWeakThemes.length > 0) {
    for (const theme of session.forcedWeakThemes) {
      const puzzle = await findPuzzleInBand(targetRating, config.bandWidth * 2, seenIds, theme, pick);
      if (puzzle) return puzzle;
    }
  } else if (session.weakThemeBoost) {
    // Standard periodic weakness boost using local DB history
    const weakThemes = await getWeakestThemes(3);
    for (const theme of weakThemes) {
      const puzzle = await findPuzzleInBand(targetRating, config.bandWidth, seenIds, theme, pick);
      if (puzzle) return puzzle;
    }
  }

  // Standard: find puzzle in rating band, widening if needed. A depth window
  // widens further — a long puzzle a little off-rating beats no long puzzle.
  const bandWidths = opts.depth
    ? [config.bandWidth, config.bandWidth * 2, config.bandWidth * 3, config.bandWidth * 5]
    : [config.bandWidth, config.bandWidth * 2, config.bandWidth * 3];
  for (const bw of bandWidths) {
    const puzzle = await findPuzzleInBand(targetRating, bw, seenIds, undefined, pick);
    if (puzzle) return puzzle;
  }

  return null;
}

interface SelectionPick {
  preferMultiMove: boolean;
  depth?: { min: number; max: number };
}

async function findPuzzleInBand(
  targetRating: number,
  bandWidth: number,
  seenIds: Set<string>,
  theme: string | undefined,
  pick: SelectionPick,
): Promise<PuzzleRecord | null> {
  const r = safeRatingKey(targetRating);
  const min = r - bandWidth;
  const max = r + bandWidth;

  // The WHOLE band, not `.limit(80)`: the rating index returns rows in rating
  // order, so a limit kept only the 80 easiest puzzles in the band — every
  // pick sat near the band's floor, ~100 points under the target, whatever the
  // student's rating (found 2026-10-01).
  let puzzles = await db.puzzles
    .where('rating')
    .between(min, max)
    .toArray();

  // Filter out seen puzzles
  puzzles = puzzles.filter((p) => !seenIds.has(p.id));

  // Filter by theme if specified
  if (theme) {
    puzzles = puzzles.filter((p) => p.themes.includes(theme));
  }

  const depth = pick.depth;
  if (depth) {
    puzzles = puzzles.filter((p) => {
      const d = solverMoves(p);
      return d >= depth.min && d <= depth.max;
    });
  }

  if (puzzles.length === 0) return null;

  // FAVOR multi-move sequences (David 2026-09-14 / 2026-10-01: "no one likes
  // simple one movers") — when a healthy multi-move pool exists in-band, draw
  // from it; otherwise fall back to the full pool so selection never starves.
  let candidates = puzzles;
  if (pick.preferMultiMove) {
    const multi = puzzles.filter(isMultiMovePuzzle);
    if (multi.length >= 3) candidates = multi;
  }

  // Prefer puzzles closer to target rating, with some randomness
  candidates.sort((a, b) => {
    const distA = Math.abs(a.rating - targetRating);
    const distB = Math.abs(b.rating - targetRating);
    return distA - distB;
  });

  // Variety among the ten closest — but only those within 75 of the nearest,
  // so a dense band at its floor can never outvote a puzzle on target.
  const nearest = Math.abs(candidates[0].rating - targetRating);
  const pool = candidates
    .slice(0, Math.min(10, candidates.length))
    .filter((p) => Math.abs(p.rating - targetRating) <= nearest + 75);
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
