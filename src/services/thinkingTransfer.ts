// thinkingTransfer — DID THE LESSON REACH THE BOARD? (Learn how to think D7:
// "Transfer is the real score. A skill is learned when the same mistake drops
// in their own games, not only when lesson taps are right.")
//
// Lessons measure KNOW, games measure USE; the GAP between them is the signal
// the coach acts on (plan "Memory"). This is the computer that reads the gap,
// per thinking step, from two halves of the ONE record:
//
//   • KNOW — the step's tags on the lesson reading (`summariseEvidence(…,
//     'know')`), judged by the ONE bar (`standingFromProfile` →
//     `capabilityProven`). Replayed in time order so the moment the step went
//     green is COMPUTED, never stored beside the record.
//   • USE  — the slips game analysis filed under the step's tags, as a rate per
//     analysed game, BEFORE vs AFTER that moment (game dates, not analysis
//     dates: a game imported today but played last month is "before").
//
// The classes:
//   transferred      — known, and the mistake dropped in games after it went
//                      green (or the game reading itself proves the step).
//   known-not-used   — known, and the slips keep coming at the same rate or
//                      worse. The idea is known; the HABIT is not — drill it in
//                      live play, never another lesson on the idea.
//   unmeasured       — known, but the games since say nothing yet (none played,
//                      or no slips either side and USE not proven). Absent is
//                      not evidence (CLAUDE.md "absent ≠ silent"), so this is
//                      named rather than folded into either verdict.
//   not-known        — asked in lessons, not green.
//   grey             — never asked in lessons.
//
// PURE: rows in, verdicts out. No threshold of its own — "dropped" is a strict
// comparison of two rates, and "known" is the one bar.
import {
  capabilityProven, summariseEvidence, EVIDENCE_READING,
  type CapabilityEvidenceRecord, type CapabilityProfile,
} from './capabilityEvidence';
import { standingFromProfile } from './thinkingLessonRecord';
import { THINKING_STEPS, THINKING_STEP_ORDER, type ThinkingStep } from './thinkingSteps';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export type TransferClass = 'transferred' | 'known-not-used' | 'unmeasured' | 'not-known' | 'grey';

/** Every class, in a fixed order (the audit row's distribution keys). */
export const TRANSFER_CLASSES: readonly TransferClass[] = ['transferred', 'known-not-used', 'unmeasured', 'not-known', 'grey'];

/** One analysed game of the student's own, with when it was PLAYED (ms). */
export interface TransferGame {
  id: string;
  playedAt: number;
}

/** One slip game analysis filed, and the game it came from. */
export interface TransferSlip {
  tag: string;
  gameId: string;
}

export interface GameWindow {
  games: number;
  slips: number;
}

export interface StepTransfer {
  step: ThinkingStep;
  cls: TransferClass;
  /** When the step's current KNOW green run began (ms); null when not green. */
  greenAt: number | null;
  before: GameWindow;
  after: GameWindow;
  /** The game reading proves every tag of the step (`capabilityProven`, USE). */
  useProven: boolean;
}

function isKnowRow(r: CapabilityEvidenceRecord): boolean {
  return ((EVIDENCE_READING as Partial<Record<string, string>>)[r.origin] ?? 'use') === 'know';
}

/** When the step's CURRENT green run on the KNOW reading began, or null when
 *  it is not green now. Replays the step's lesson rows in time order through
 *  the same summariser and the same standing rule every reader uses. */
export function knowGreenSince(rows: readonly CapabilityEvidenceRecord[], tags: readonly MisconceptionTagId[]): number | null {
  const mine = rows.filter((r) => isKnowRow(r) && tags.includes(r.tag)).sort((a, b) => a.recordedAt - b.recordedAt);
  let since: number | null = null;
  for (let i = 0; i < mine.length; i += 1) {
    const green = standingFromProfile(summariseEvidence(mine.slice(0, i + 1), {}, 'know'), tags) === 'green';
    if (green && since === null) since = mine[i].recordedAt;
    if (!green) since = null;
  }
  return since;
}

function windowOf(games: readonly TransferGame[], slips: readonly TransferSlip[], tags: readonly string[], keep: (g: TransferGame) => boolean): GameWindow {
  const ids = new Set(games.filter(keep).map((g) => g.id));
  return { games: ids.size, slips: slips.filter((s) => ids.has(s.gameId) && tags.includes(s.tag)).length };
}

const rate = (w: GameWindow): number => (w.games > 0 ? w.slips / w.games : 0);

/** The verdict for one step. PURE. */
export function classifyStepTransfer(args: {
  step: ThinkingStep;
  evidence: readonly CapabilityEvidenceRecord[];
  useProfile: CapabilityProfile;
  games: readonly TransferGame[];
  slips: readonly TransferSlip[];
}): StepTransfer {
  const tags = THINKING_STEPS[args.step].tags;
  const greenAt = knowGreenSince(args.evidence, tags);
  const useProven = tags.every((t) => capabilityProven(args.useProfile.get(t)));
  const before = windowOf(args.games, args.slips, tags, (g) => greenAt !== null && g.playedAt <= greenAt);
  const after = windowOf(args.games, args.slips, tags, (g) => greenAt !== null && g.playedAt > greenAt);
  const base = { step: args.step, greenAt, before, after, useProven };
  if (greenAt === null) {
    const asked = args.evidence.some((r) => isKnowRow(r) && tags.includes(r.tag) && !r.prompted);
    return { ...base, cls: asked ? 'not-known' : 'grey' };
  }
  if (after.games === 0) return { ...base, cls: 'unmeasured' };
  // The mistake DROPPED: fewer slips per game after the step went green than
  // before it. With no games before, there is no baseline to drop from.
  if (before.games > 0 && rate(after) < rate(before)) return { ...base, cls: 'transferred' };
  if (after.slips > 0) return { ...base, cls: 'known-not-used' };
  // No slips since and none to compare against: the game reading decides.
  return { ...base, cls: useProven ? 'transferred' : 'unmeasured' };
}

/** Every step's verdict, in routine order. PURE. */
export function thinkingTransfer(args: {
  evidence: readonly CapabilityEvidenceRecord[];
  useProfile?: CapabilityProfile;
  games: readonly TransferGame[];
  slips: readonly TransferSlip[];
}): StepTransfer[] {
  const useProfile = args.useProfile ?? summariseEvidence([...args.evidence], {}, 'use');
  return THINKING_STEP_ORDER.map((step) => classifyStepTransfer({ step, evidence: args.evidence, useProfile, games: args.games, slips: args.slips }));
}

/** Counts per class — the audit row's distribution. PURE. */
export function transferCounts(all: readonly StepTransfer[]): Record<TransferClass, number> {
  const out = Object.fromEntries(TRANSFER_CLASSES.map((c) => [c, 0])) as Record<TransferClass, number>;
  for (const t of all) out[t.cls] += 1;
  return out;
}

/** The known-not-used step whose games still slip the most per game, or null. */
export function worstGap(all: readonly StepTransfer[]): StepTransfer | null {
  return all
    .filter((t) => t.cls === 'known-not-used')
    .sort((a, b) => rate(b.after) - rate(a.after) || THINKING_STEPS[a.step].order - THINKING_STEPS[b.step].order)[0] ?? null;
}

/** How each step's gap is said: what the student does in lessons, and what
 *  their games still show. Exhaustive, so a new step fails to compile until
 *  its gap is phrased. Second person; the opponent is "they". */
const GAP_WORDS: Record<ThinkingStep, { know: string; use: string }> = {
  assess: { know: 'you judge the position before you move', use: 'you still move before you look' },
  'their-move-changed': { know: 'you see what their move changed', use: 'you still miss what their move threatens' },
  'am-i-safe': { know: 'you spot your loose pieces', use: 'you still leave them hanging' },
  'answer-danger': { know: 'you answer the danger', use: 'you still let their threat land' },
  'their-targets': { know: 'you find their loose pieces', use: 'you still walk past them' },
  'forcing-moves': { know: 'you list your checks, captures and threats', use: 'you still miss the forcing move' },
  'hit-two': { know: 'you find the move that hits two', use: 'you still miss the double attack' },
  candidates: { know: 'you compare your candidate moves', use: 'you still play the first one you see' },
  calculate: { know: 'you calculate to the end of the line', use: 'you still stop a move too soon' },
  'is-my-move-safe': { know: 'you check your move is safe', use: 'you still play moves that drop material' },
};

const GAP_STEMS: readonly ((k: string, u: string) => string)[] = [
  (k, u) => `In lessons ${k}; in your games ${u}.`,
  (k, u) => `You know this one: in lessons ${k}. In your games ${u}.`,
  (k, u) => `Lessons say ${k}. Your games say ${u}.`,
];

/** The gap, said once (rotated on the step and how many slips it has had since,
 *  so it is stable for a moment and changes as the record does). */
export function transferGapLine(t: StepTransfer): string {
  const w = GAP_WORDS[t.step];
  return rotateStem(GAP_STEMS.map((f) => f(w.know, w.use)), stemKeyOf(t.step) + t.after.slips);
}
