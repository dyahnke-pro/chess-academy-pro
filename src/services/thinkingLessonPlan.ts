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
//   • When every step the student can be served in the open tiers is green,
//     nothing red or grey is due: if two or more of those proven steps can be
//     asked on a plain board, the lesson is a MIXED round (plan D6 — the
//     student first decides WHICH step a board asks, as real games demand);
//     with fewer, the first comes back as a quick review (one Solo board).
//
// The method ORDER never changes; only which step is served. PURE.
import type { StepKit } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { THINKING_STEPS, tierUnlocked as stepTierUnlocked, type ThinkingStep } from './thinkingSteps';
import { rotateStem } from '../utils/rotateStem';
import { andList } from '../utils/andList';
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
  reason: 'game-weakness' | 'red-first' | 'next-unknown' | 'review' | 'mixed';
  /** The highest tier open to this student. */
  openTier: number;
  /** A mixed round: the proven steps whose boards are mixed (≥2, routine
   *  order). `step` is the first of them. Absent for a single-step lesson. */
  mix?: BuiltStep[];
}

/** A step can join a mixed round when its question is asked on the board as
 *  it stands: no played move to replay (`adapt` — its lead line would name the
 *  step) and no engine call per board (`enrich`). */
export function mixable(s: BuiltStep): boolean {
  const k = s.kit();
  return !k.adapt && !k.enrich;
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
  // Everything due is proven: mix the proven steps when there are two to
  // choose between, else review the first.
  const mix = open.map((x) => x.s).filter(mixable);
  if (mix.length >= 2) return { step: mix[0], standing: 'green', reason: 'mixed', openTier: tier, mix };
  return { step: open[0].s, standing: 'green', reason: 'review', openTier: tier };
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

// ─── The close (plan D8) ───────────────────────────────────────────────────

const STEP_GREEN_PRAISE = ['Earned.', 'Proven on the board, not guessed.', 'Locked in.'];
const TIER_PRAISE = ['A new tier — earned.', 'That opens a new tier. Well found.'];

const quotedStep = (step: string): string =>
  `"${step in THINKING_STEPS ? THINKING_STEPS[step as ThinkingStep].name : step}"`;

/**
 * What a lesson closes with: what was PROVEN (steps that turned green on this
 * lesson's answers), a tier that opened, and what is NEXT (the step the chooser
 * would pick now). Praise only where it was earned — a step turning green or a
 * tier opening — with stems rotated on `key`, never rolled. Null when there is
 * nothing to say. PURE.
 */
export function lessonCloseLine(c: {
  /** The step just taught (`mixed` for a mixed round). */
  step: string;
  proven: readonly string[];
  tierLine: string | null;
  next: StepChoice | null;
  key: number;
}): string | null {
  const parts: string[] = [];
  if (c.proven.length > 0) {
    const names = andList(c.proven.map(quotedStep));
    parts.push(`${names} ${c.proven.length === 1 ? 'is' : 'are'} green on your skill chart now. ${rotateStem(STEP_GREEN_PRAISE, c.key)}`);
  }
  if (c.tierLine) parts.push(`${rotateStem(TIER_PRAISE, c.key)} ${c.tierLine}`);
  if (c.next) {
    if (c.next.reason === 'mixed') parts.push('Next time: a mixed round — you decide which question each board asks.');
    else if (c.next.step.step === c.step) parts.push(`Next time: ${quotedStep(c.step)} again.`);
    else parts.push(`Next up: ${quotedStep(c.next.step.step)}.`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}
