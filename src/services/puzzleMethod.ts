import { methodBeatFor, type MethodHabit } from './methodBeat';

/**
 * THE METHOD BEAT ON A PUZZLE — Learn's rule brought to Tactics (hand walk
 * 2026-10-01): a habit is taught only when a computed signal EARNS it, once.
 * The puzzles used to say "look for checks, captures, and threats" to every
 * stuck student on every unnamed puzzle — including ones whose answer was a
 * quiet move (Qc5 guarding d6), where that advice points the wrong way.
 *
 * `methodBeatFor` is the one computer: it teaches the forcing scan only when
 * the answer IS a check or capture and the swing is real, and says each habit
 * once per session (`said`). Null means stay quiet.
 */
export function puzzleMethodLine(
  bestSan: string | null,
  /** What the puzzle is worth, mover-POV cp: the mistake's cost on a My
   *  Mistakes card, or the Lichess theme's definition (see `cpFromThemes`). */
  stakesCp: number | null,
  said: Set<MethodHabit>,
  variety = 0,
): string | null {
  return methodBeatFor({
    tier: 'swing',
    cpLossCp: stakesCp,
    bestSan,
    ignoredThreat: false,
    isStudentMove: true,
    saidHabits: said,
  }, variety);
}

/** A Lichess puzzle carries no cpLoss; its tags say how much the answer wins.
 *  Lichess defines `crushing` and `mate` as decisive and `advantage` as a clear
 *  edge — read as the size of the miss, never a guess about the student. */
export function cpFromThemes(themes: readonly string[]): number | null {
  if (themes.some((t) => /^mate|crushing/.test(t))) return 300;
  if (themes.includes('advantage')) return 150;
  return null;
}
