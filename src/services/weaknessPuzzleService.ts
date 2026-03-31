import { getMistakePuzzlesDue, getAllMistakePuzzles } from './mistakePuzzleService';
import { getPuzzlesByTheme, getWeakestThemes, mistakePuzzleToPuzzleRecord } from './puzzleService';
import { getStoredWeaknessProfile } from './weaknessAnalyzer';
import type { PuzzleRecord, MistakePuzzle } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type WeaknessPuzzleSource = 'mistake' | 'theme';

export interface WeaknessPuzzleItem {
  puzzle: PuzzleRecord;
  source: WeaknessPuzzleSource;
  /** Original mistake puzzle if source === 'mistake', for richer UI context. */
  originalMistake?: MistakePuzzle;
}

// ─── Queue Builder ─────────────────────────────────────────────────────────

/**
 * Builds a 50/50 interleaved queue of game-mistake puzzles and weak-theme
 * tactical puzzles. Falls back to filling from whichever pool has more
 * if the other runs dry.
 */
export async function buildWeaknessPuzzleQueue(
  count: number = 20,
): Promise<WeaknessPuzzleItem[]> {
  const halfCount = Math.ceil(count / 2);

  // ── Fetch mistake puzzles ──────────────────────────────────────────────
  const dueMistakes = await getMistakePuzzlesDue(halfCount);
  let mistakes: MistakePuzzle[] = dueMistakes;

  // If not enough SRS-due mistakes, backfill with unsolved/solved (not mastered)
  if (mistakes.length < halfCount) {
    const all = await getAllMistakePuzzles();
    const dueIds = new Set(mistakes.map((m) => m.id));
    const backfill = all.filter(
      (m) => !dueIds.has(m.id) && m.status !== 'mastered',
    );
    mistakes = [...mistakes, ...backfill].slice(0, halfCount);
  }

  // ── Fetch weak-theme puzzles ───────────────────────────────────────────
  const weakThemes = await getWeakThemesFromProfile();
  const themePuzzles: PuzzleRecord[] = [];
  const seenIds = new Set(mistakes.map((m) => m.id));

  for (const theme of weakThemes) {
    if (themePuzzles.length >= halfCount) break;
    const batch = await getPuzzlesByTheme(theme, halfCount);
    for (const p of batch) {
      if (themePuzzles.length >= halfCount) break;
      if (!seenIds.has(p.id)) {
        themePuzzles.push(p);
        seenIds.add(p.id);
      }
    }
  }

  // ── Interleave 50/50 ──────────────────────────────────────────────────
  const result: WeaknessPuzzleItem[] = [];
  const mi = mistakes.length;
  const ti = themePuzzles.length;
  let m = 0;
  let t = 0;

  while (result.length < count && (m < mi || t < ti)) {
    if (m < mi && (result.length % 2 === 0 || t >= ti)) {
      const mp = mistakes[m];
      result.push({
        puzzle: mistakePuzzleToPuzzleRecord(mp),
        source: 'mistake',
        originalMistake: mp,
      });
      m++;
    } else if (t < ti) {
      result.push({
        puzzle: themePuzzles[t],
        source: 'theme',
      });
      t++;
    }
  }

  return result;
}

/**
 * Gets the user's weakest tactical themes. Prefers the stored weakness
 * profile (from game analysis), falls back to puzzle-attempt stats.
 */
async function getWeakThemesFromProfile(): Promise<string[]> {
  const profile = await getStoredWeaknessProfile();
  if (profile) {
    const tacticalWeaknesses = profile.items
      .filter((item) => item.category === 'tactics')
      .map((item) => {
        // Extract theme name from the label (e.g., "Low fork accuracy" -> "fork")
        const match = item.label.match(/Low (\w+) accuracy/i);
        return match ? match[1] : null;
      })
      .filter((t): t is string => t !== null);

    if (tacticalWeaknesses.length > 0) return tacticalWeaknesses;
  }

  // Fallback: use puzzle-attempt-based weakest themes
  return getWeakestThemes(5);
}
