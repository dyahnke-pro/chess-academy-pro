import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { mistakePuzzleToPuzzleRecord } from './puzzleService';
import type { MistakePuzzle, TacticType, PuzzleRecord } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TacticDrillItem {
  puzzle: PuzzleRecord;
  originalMistake: MistakePuzzle;
  tacticType: TacticType;
}

// ─── Queue Builder ─────────────────────────────────────────────────────────

/**
 * Builds a drill queue of tactic-only mistake puzzles from the user's games.
 * Optionally filters to specific tactic types (e.g., only forks).
 */
export async function buildTacticDrillQueue(
  count: number = 20,
  filterTypes?: TacticType[],
): Promise<TacticDrillItem[]> {
  const today = new Date().toISOString().split('T')[0];

  // Get all mistake puzzles with meaningful CP loss
  const allMistakes = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 50)
    .toArray();

  // Classify each by tactic type and filter
  const classified: Array<{ mistake: MistakePuzzle; tacticType: TacticType }> = [];
  for (const m of allMistakes) {
    const tacticType = detectTacticType(m.fen, m.bestMove);
    // Skip generic "tactical_sequence" — we want specific tactic types
    if (tacticType === 'tactical_sequence') continue;
    if (filterTypes && !filterTypes.includes(tacticType)) continue;
    classified.push({ mistake: m, tacticType });
  }

  // Prioritize: SRS due first, then unsolved, then by recency
  classified.sort((a, b) => {
    // Due items first
    const aDue = a.mistake.srsDueDate <= today;
    const bDue = b.mistake.srsDueDate <= today;
    if (aDue !== bDue) return aDue ? -1 : 1;

    // Unsolved before solved
    const aUnsolved = a.mistake.status === 'unsolved';
    const bUnsolved = b.mistake.status === 'unsolved';
    if (aUnsolved !== bUnsolved) return aUnsolved ? -1 : 1;

    // Mastered items last
    const aMastered = a.mistake.status === 'mastered';
    const bMastered = b.mistake.status === 'mastered';
    if (aMastered !== bMastered) return aMastered ? 1 : -1;

    // Newest first
    const dateA = a.mistake.gameDate ? new Date(a.mistake.gameDate).getTime() : new Date(a.mistake.createdAt).getTime();
    const dateB = b.mistake.gameDate ? new Date(b.mistake.gameDate).getTime() : new Date(b.mistake.createdAt).getTime();
    return dateB - dateA;
  });

  return classified.slice(0, count).map(({ mistake, tacticType }) => ({
    puzzle: mistakePuzzleToPuzzleRecord(mistake),
    originalMistake: mistake,
    tacticType,
  }));
}

/**
 * Returns counts of available tactic drills per type.
 */
export async function getTacticDrillCounts(): Promise<Map<TacticType, number>> {
  const allMistakes = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 50 && m.status !== 'mastered')
    .toArray();

  const counts = new Map<TacticType, number>();
  for (const m of allMistakes) {
    const tacticType = detectTacticType(m.fen, m.bestMove);
    if (tacticType === 'tactical_sequence') continue;
    counts.set(tacticType, (counts.get(tacticType) ?? 0) + 1);
  }

  return counts;
}
