// thinkingLessonPlan — WHICH step a "Learn how to think" visit teaches, from the
// student's own record (plan "Unlocking" rules 1–5; CLAUDE.md "everything is
// algo-based"). Nothing here is hand-picked per student.
//
//   • Tiers unlock by PROOF: a tier is open when every step of every lower tier
//     is known (green). Rating never opens or closes one (David decision #3).
//   • Within the open tiers, a RED step (their record shows it breaking) jumps
//     the queue — lowest tier, then lowest method order, first.
//   • Otherwise the lowest (tier, order) step not yet known (grey teaches).
//   • When every built step is green, the first comes back as a quick review
//     (the session serves one Solo board for a green step).
//
// The method ORDER never changes; only which step is served. PURE.
import type { StepKit } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export interface BuiltStep {
  /** Position in the ten-step method (1 = assess … 10 = is my move safe). */
  order: number;
  /** Unlock tier (1 = see the board … 4 = think like a player). */
  tier: 1 | 2 | 3 | 4;
  kit: () => StepKit;
  tags: readonly MisconceptionTagId[];
}

export interface StepChoice {
  step: BuiltStep;
  standing: StepStanding;
  reason: 'red-first' | 'next-unknown' | 'review';
  /** The highest tier open to this student. */
  openTier: number;
}

/** The highest open tier: tier 1 always; tier n+1 once every built step of
 *  tiers ≤ n is green. */
export function openTier(
  steps: readonly BuiltStep[],
  standingOf: (s: BuiltStep) => StepStanding,
  /** A step this student cannot be served yet (no fair board) does not hold
   *  a tier shut — it is proven when boards exist, not before. */
  available: (s: BuiltStep) => boolean = () => true,
): number {
  let open = 1;
  for (let t = 1; t <= 3; t++) {
    const inTier = steps.filter((s) => s.tier === t && available(s));
    if (inTier.length === 0 || inTier.some((s) => standingOf(s) !== 'green')) break;
    open = t + 1;
  }
  return open;
}

export function chooseThinkingStep(
  steps: readonly BuiltStep[],
  standingOf: (s: BuiltStep) => StepStanding,
  /** Whether this student has a fair board for the step right now (a step
   *  that needs their own games has none on a fresh device). Unavailable steps
   *  are skipped, never served empty. Defaults to every step. */
  available: (s: BuiltStep) => boolean = () => true,
): StepChoice | null {
  if (steps.length === 0) return null;
  const ordered = [...steps].sort((a, b) => a.tier - b.tier || a.order - b.order);
  const tier = openTier(ordered, standingOf, available);
  const open = ordered.filter((s) => s.tier <= tier && available(s)).map((s) => ({ s, st: standingOf(s) }));
  if (open.length === 0) return null;
  const red = open.find((x) => x.st === 'red');
  if (red) return { step: red.s, standing: 'red', reason: 'red-first', openTier: tier };
  const unknown = open.find((x) => x.st !== 'green');
  if (unknown) return { step: unknown.s, standing: unknown.st, reason: 'next-unknown', openTier: tier };
  return { step: open[0].s, standing: 'green', reason: 'review', openTier: tier };
}

/** What each tier is called when it opens (plan "Unlocking"). */
export const TIER_NAME: Record<2 | 3 | 4, { name: string; next: string }> = {
  2: { name: 'Force it', next: 'You see the board. Next: forcing moves — every check, capture and threat, and answering theirs.' },
  3: { name: 'Combine and calculate', next: 'You force the play. Next: hitting two at once and calculating to the end of a line.' },
  4: { name: 'Think like a player', next: 'You combine. Next: judging the position and choosing between good moves.' },
};

/** The line and banner for a tier that just opened, or null when none did. */
export function tierUnlocked(before: number, after: number): { tier: 2 | 3 | 4; line: string; label: string } | null {
  if (after <= before || after < 2 || after > 4) return null;
  const tier = after as 2 | 3 | 4;
  return { tier, line: TIER_NAME[tier].next, label: `UNLOCKED · ${TIER_NAME[tier].name.toUpperCase()}` };
}
