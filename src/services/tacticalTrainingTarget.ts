/**
 * Which motif the Tactical Profile's training button points at — and what it
 * may honestly CALL it.
 *
 * Walk 2026-10-03: every motif read 100% and the button said "Train Your
 * Weakest — Opening Traps", because the pick sorted by accuracy and a tie at
 * 100% fell to whichever came first. A motif is only WEAK on evidence: enough
 * attempts to mean something, AND an accuracy below the bar. When nothing is,
 * the button says so and points at the least-practised motif instead —
 * a never-tried motif first (grey means teach it), then the fewest attempts.
 */

export interface ThemeCategoryStats {
  name: string;
  /** 0..1, or -1 when never attempted. */
  accuracy: number;
  attempts: number;
  themes: string[];
}

/** Fewer attempts than this is not evidence of anything — one miss in two is noise. */
export const WEAK_MIN_ATTEMPTS = 5;
/** Below this first-try accuracy, a motif is genuinely weak. */
export const WEAK_ACCURACY_BAR = 0.75;

export type TrainingTarget =
  | { kind: 'weak'; category: ThemeCategoryStats }
  | { kind: 'least-practised'; category: ThemeCategoryStats }
  | { kind: 'none' };

export function pickTrainingTarget(categories: readonly ThemeCategoryStats[]): TrainingTarget {
  const weak = categories
    .filter((c) => c.attempts >= WEAK_MIN_ATTEMPTS && c.accuracy >= 0 && c.accuracy < WEAK_ACCURACY_BAR)
    .sort((a, z) => (a.accuracy - z.accuracy) || (z.attempts - a.attempts) || a.name.localeCompare(z.name));
  if (weak.length > 0) return { kind: 'weak', category: weak[0] };
  const least = [...categories].sort((a, z) => (a.attempts - z.attempts) || a.name.localeCompare(z.name));
  return least.length > 0 ? { kind: 'least-practised', category: least[0] } : { kind: 'none' };
}

/** The button's label, honest about which kind of pick it is. */
export function trainingTargetLabel(t: TrainingTarget): { title: string; detail: string | null } {
  if (t.kind === 'weak') return { title: 'Train Your Weakest', detail: t.category.name };
  if (t.kind === 'least-practised') {
    return { title: 'No weak motif yet', detail: `least practised: ${t.category.name}` };
  }
  return { title: 'Start training', detail: null };
}
