import { db } from '../db/schema';
import { getThemeSkills } from './puzzleService';
import { detectTacticType } from './missedTacticService';
import { TACTIC_LABELS } from './tacticClassifierService';
import type {
  TacticalProfile,
  TacticTypeStats,
  TacticType,
  MistakeGamePhase,
  MistakePuzzle,
} from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────

const ALL_TACTIC_TYPES: TacticType[] = [
  'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank',
  'hanging_piece', 'promotion', 'deflection', 'overloaded_piece',
  'tactical_sequence',
];

/** Map puzzle theme names to TacticType for cross-referencing. */
const THEME_TO_TACTIC: Record<string, TacticType> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered_attack',
  backRankMate: 'back_rank',
  sacrifice: 'deflection',
  deflection: 'deflection',
  hangingPiece: 'hanging_piece',
};

const META_KEY = 'tactical_profile';

// ─── Profile Computation ───────────────────────────────────────────────────

/**
 * Computes the full tactical profile by aggregating missed tactics from
 * all mistake puzzles and cross-referencing with puzzle theme accuracy.
 */
export async function computeTacticalProfile(): Promise<TacticalProfile> {
  // Get all mistake puzzles (these come from analyzed games)
  const allMistakes = await db.mistakePuzzles.toArray();

  // Classify each mistake puzzle by tactic type
  const classifiedMistakes = classifyMistakePuzzles(allMistakes);

  // Get puzzle theme accuracy for gap calculation
  const themeSkills = await getThemeSkills();
  const themeAccuracyMap = new Map(themeSkills.map((s) => [s.theme, s]));

  // Build per-tactic-type stats
  const stats: TacticTypeStats[] = ALL_TACTIC_TYPES.map((tacticType) => {
    const misses = classifiedMistakes.filter((m) => m.tacticType === tacticType);
    const gameMissCount = misses.length;

    // Puzzle accuracy for this tactic type
    const mappedThemes = Object.entries(THEME_TO_TACTIC)
      .filter(([, tt]) => tt === tacticType)
      .map(([theme]) => theme);

    let puzzleAccuracy = 0;
    let puzzleAttempts = 0;
    for (const theme of mappedThemes) {
      const skill = themeAccuracyMap.get(theme);
      if (skill) {
        puzzleAccuracy = Math.max(puzzleAccuracy, skill.accuracy);
        puzzleAttempts += skill.attempts;
      }
    }

    // Game spotting rate: rough estimate based on how many tactical positions
    // the player successfully navigated vs missed
    const gameTotalOccurrences = gameMissCount; // missed = didn't spot
    const gameSpotCount = 0; // We only track misses, not successes in games
    const gameSpotRate = gameTotalOccurrences > 0
      ? gameSpotCount / (gameSpotCount + gameMissCount)
      : puzzleAttempts > 0 ? puzzleAccuracy : -1; // -1 = no data

    // The gap: puzzle accuracy minus game spot rate
    const gap = gameSpotRate >= 0 ? puzzleAccuracy - gameSpotRate : 0;

    // Breakdowns
    const byPhase: Record<MistakeGamePhase, number> = {
      opening: 0,
      middlegame: 0,
      endgame: 0,
    };
    const byOpening: Record<string, number> = {};

    for (const miss of misses) {
      byPhase[miss.gamePhase] = (byPhase[miss.gamePhase] || 0) + 1;
      if (miss.openingName) {
        byOpening[miss.openingName] = (byOpening[miss.openingName] || 0) + 1;
      }
    }

    return {
      tacticType,
      puzzleAccuracy,
      puzzleAttempts,
      gameMissCount,
      gameSpotCount,
      gameTotalOccurrences,
      gameSpotRate,
      gap,
      byPhase,
      byOpening,
    };
  });

  // Filter to types with actual data
  const activeStats = stats.filter(
    (s) => s.gameMissCount > 0 || s.puzzleAttempts > 0,
  );

  // Sort: highest miss count first (most problematic)
  activeStats.sort((a, b) => b.gameMissCount - a.gameMissCount);

  // Weakest types: highest miss count with worst puzzle accuracy
  const weakestTypes = activeStats
    .filter((s) => s.gameMissCount > 0)
    .sort((a, b) => {
      // Primary: most misses. Secondary: lowest puzzle accuracy
      const scoreDiff = b.gameMissCount - a.gameMissCount;
      if (scoreDiff !== 0) return scoreDiff;
      return a.puzzleAccuracy - b.puzzleAccuracy;
    })
    .slice(0, 3)
    .map((s) => s.tacticType);

  const totalGamesMissed = allMistakes.length;

  // Count analyzed games
  const analyzedMeta = await db.meta
    .filter((m) => m.key.startsWith('mistakes_generated_') && m.value === 'true')
    .count();

  const profile: TacticalProfile = {
    computedAt: new Date().toISOString(),
    stats: activeStats,
    totalGamesMissed,
    totalGamesAnalyzed: analyzedMeta,
    weakestTypes,
  };

  // Cache
  await db.meta.put({ key: META_KEY, value: JSON.stringify(profile) });

  return profile;
}

/**
 * Returns the cached tactical profile, or null if never computed.
 */
export async function getStoredTacticalProfile(): Promise<TacticalProfile | null> {
  const meta = await db.meta.get(META_KEY);
  if (!meta) return null;

  try {
    return JSON.parse(meta.value) as TacticalProfile;
  } catch {
    return null;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface ClassifiedMistake {
  id: string;
  tacticType: TacticType;
  gamePhase: MistakeGamePhase;
  openingName: string | null;
  cpLoss: number;
}

/**
 * Classify each mistake puzzle by its tactic type using the best move.
 */
function classifyMistakePuzzles(mistakes: MistakePuzzle[]): ClassifiedMistake[] {
  return mistakes
    .filter((m) => m.cpLoss >= 50 && m.fen && m.bestMove) // Only valid, meaningful tactical misses
    .map((m) => {
      const tacticType = detectTacticType(m.fen, m.bestMove);
      return {
        id: m.id,
        tacticType,
        gamePhase: m.gamePhase,
        openingName: m.openingName ?? null,
        cpLoss: m.cpLoss,
      };
    });
}

/**
 * Returns a human-readable label for a tactic type.
 */
export function tacticTypeLabel(type: TacticType): string {
  return TACTIC_LABELS[type];
}

/**
 * Returns an icon/emoji for a tactic type.
 */
export function tacticTypeIcon(type: TacticType): string {
  const icons: Record<TacticType, string> = {
    fork: '\u2694\uFE0F',
    pin: '\uD83D\uDCCC',
    skewer: '\uD83D\uDDE1\uFE0F',
    discovered_attack: '\uD83D\uDCA5',
    back_rank: '\uD83C\uDFF0',
    hanging_piece: '\u26A0\uFE0F',
    promotion: '\uD83D\uDC51',
    deflection: '\u21AA\uFE0F',
    overloaded_piece: '\u2696\uFE0F',
    trapped_piece: '\uD83E\uDEA4',
    clearance: '\uD83D\uDEA7',
    interference: '\uD83D\uDEAB',
    zwischenzug: '\u26A1',
    x_ray: '\uD83D\uDD2C',
    double_check: '\u2757\u2757',
    tactical_sequence: '\uD83C\uDFAF',
  };
  return icons[type];
}
