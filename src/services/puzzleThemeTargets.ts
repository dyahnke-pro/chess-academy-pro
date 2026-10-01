import type { WeaknessSignal } from './weaknessSignal';

/** One puzzle theme's accuracy, as `puzzleService.getThemeSkills` reports it. */
export interface ThemeAccuracy {
  theme: string;
  accuracy: number;
  attempts: number;
}

/** Below this accuracy, over at least `MIN_ATTEMPTS`, a puzzle theme is weak. */
const WEAK_ACCURACY = 0.6;
const MIN_ATTEMPTS = 3;

/**
 * WHICH THEMES THE NEXT PUZZLE SHOULD TRAIN — from the student's WHOLE record,
 * not from the puzzles alone (David 2026-10-01: "The algo is generated from
 * users entire data base. Not just puzzles").
 *
 * The order is the heat map's:
 *   1. RED  — holes the weakness spine holds open (games, drills, coach
 *      captures and puzzles together), worst first. A hole the lifecycle marks
 *      `fixed` is not red any more.
 *   2. WEAK PUZZLE THEMES — tried at least a few times, mostly missed.
 *   3. GREY — themes never tried. Grey means TEACH it, so it is never dropped;
 *      it is ROTATED by `rotation` (stable, never random) so a new student
 *      meets every theme instead of the same first three every time — which is
 *      what the puzzle-only picker did.
 *
 * The list is a queue of targets, not a cap on teaching: the caller tries each
 * in turn and falls back to rating-only selection.
 */
export function rankThemeTargets(
  signals: readonly WeaknessSignal[],
  skills: readonly ThemeAccuracy[],
  allThemes: readonly string[],
  rotation: number,
  limit: number,
): string[] {
  const out: string[] = [];
  const add = (t: string): void => { if (!out.includes(t)) out.push(t); };

  const red = signals
    .filter((w) => w.openCount > 0 && w.lifecycleStatus !== 'fixed' && w.puzzleThemes.length > 0)
    .sort((a, b) => b.severity - a.severity || b.openCount - a.openCount);
  for (const w of red) for (const t of w.puzzleThemes) add(t);

  const weak = skills
    .filter((s) => s.attempts >= MIN_ATTEMPTS && s.accuracy < WEAK_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy);
  for (const s of weak) add(s.theme);

  const tried = new Set(skills.map((s) => s.theme));
  const grey = allThemes.filter((t) => !tried.has(t));
  if (grey.length > 0) {
    const start = ((rotation % grey.length) + grey.length) % grey.length;
    for (let i = 0; i < grey.length; i += 1) add(grey[(start + i) % grey.length]);
  }

  return out.slice(0, limit);
}
