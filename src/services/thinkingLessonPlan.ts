// thinkingLessonPlan — WHICH step a "Learn how to think" visit teaches, from the
// student's own record (plan "Unlocking" rules 1–5; CLAUDE.md "everything is
// algo-based"). Nothing here is hand-picked per student.
//
//   • Tiers unlock by PROOF: a tier is open when every step of every lower tier
//     is known (green). Rating never opens or closes one (David decision #3).
//   • A step the student keeps failing IN THEIR GAMES comes first, worst first
//     (the heat map's red tiles on the step's tags — the same reading Up next
//     uses), even from a tier not yet open: a student losing pieces to forks
//     does not wait for "forks" to unlock (David 2026-10-04). A step already
//     proven in lessons is not pulled forward by games — knowing it is not the
//     gap there, using it is, and the lesson game is the tool for that.
//   • Within the open tiers, a RED step (their record shows it breaking) jumps
//     the queue — lowest tier, then lowest method order, first.
//   • Otherwise the lowest (tier, order) step not yet known (grey teaches).
//   • When every built step is green, the first comes back as a quick review
//     (the session serves one Solo board for a green step) — never a step that
//     is known but not yet used in games (`thinkingTransfer`): that habit is
//     drilled in live play, not re-taught as a lesson.
//
// The method ORDER never changes; only which step is served. PURE.
import type { StepKit } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { tierUnlocked as stepTierUnlocked, type ThinkingStep } from './thinkingSteps';
import type { HeatTile } from './heatMap';

export interface BuiltStep {
  step: ThinkingStep;
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
  reason: 'game-weakness' | 'red-first' | 'next-unknown' | 'review';
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
  // ONE tier rule (`thinkingSteps.tierUnlocked`): a tier opens when every step
  // of every lower tier is known. A step with no kit, or no board for this
  // student, cannot be asked and so does not hold its tier shut.
  const byStep = new Map(steps.map((s) => [s.step, s] as const));
  const isKnown = (step: ThinkingStep): boolean => {
    const b = byStep.get(step);
    if (!b || !available(b)) return true;
    return standingOf(b) === 'green';
  };
  let open = 1;
  for (const t of [2, 3, 4] as const) {
    if (!stepTierUnlocked(t, isKnown)) break;
    open = t;
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
  /** How badly the student's GAMES fail this step (0 = not red in games). */
  gameWeight: (s: BuiltStep) => number = () => 0,
  /** A step KNOWN in lessons whose games still slip (`thinkingTransfer`
   *  'known-not-used'): the idea is known, the habit is not, so it is never
   *  served again as a lesson — live play drills it. Defaults to none. */
  habitPending: (s: BuiltStep) => boolean = () => false,
): StepChoice | null {
  if (steps.length === 0) return null;
  const ordered = [...steps].sort((a, b) => a.tier - b.tier || a.order - b.order);
  const tier = openTier(ordered, standingOf, available);
  const fromGames = ordered
    .filter((s) => available(s) && standingOf(s) !== 'green')
    .map((s) => ({ s, w: gameWeight(s) }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w || a.s.tier - b.s.tier || a.s.order - b.s.order);
  if (fromGames.length > 0) return { step: fromGames[0].s, standing: 'red', reason: 'game-weakness', openTier: tier };
  const open = ordered.filter((s) => s.tier <= tier && available(s)).map((s) => ({ s, st: standingOf(s) }));
  if (open.length === 0) return null;
  const red = open.find((x) => x.st === 'red');
  if (red) return { step: red.s, standing: 'red', reason: 'red-first', openTier: tier };
  const unknown = open.find((x) => x.st !== 'green');
  if (unknown) return { step: unknown.s, standing: unknown.st, reason: 'next-unknown', openTier: tier };
  // Everything open is known: a quick review — of a step whose habit has also
  // reached the board. Re-teaching a known idea the games still miss is the
  // wrong tool (plan "Lessons measure KNOW, games measure USE").
  const review = open.find((x) => !habitPending(x.s));
  if (!review) return null;
  return { step: review.s, standing: 'green', reason: 'review', openTier: tier };
}

/** What each tier is called when it opens (plan "Unlocking"). */
export const TIER_NAME: Record<2 | 3 | 4, { name: string; next: string }> = {
  2: { name: 'Force it', next: 'You see the board. Next: forcing moves — every check, capture and threat, and answering theirs.' },
  3: { name: 'Combine and calculate', next: 'You force the play. Next: hitting two at once and calculating to the end of a line.' },
  4: { name: 'Think like a player', next: 'You combine. Next: judging the position and choosing between good moves.' },
};

/** The line and banner for a tier that just opened, or null when none did. */
export function tierUnlockLine(before: number, after: number): { tier: 2 | 3 | 4; line: string; label: string } | null {
  if (after <= before || after < 2 || after > 4) return null;
  const tier = after as 2 | 3 | 4;
  return { tier, line: TIER_NAME[tier].next, label: `UNLOCKED · ${TIER_NAME[tier].name.toUpperCase()}` };
}

/** How badly the student's games fail a step: across the step's tags, the red
 *  heat-map tiles' open holes plus fresh breaks. 0 when none is red. PURE. */
export function gameWeightForTags(tiles: readonly HeatTile[], tags: readonly MisconceptionTagId[]): number {
  let w = 0;
  for (const t of tiles) {
    if (t.state === 'red' && tags.includes(t.tag)) w += t.openCount + t.broken;
  }
  return w;
}
