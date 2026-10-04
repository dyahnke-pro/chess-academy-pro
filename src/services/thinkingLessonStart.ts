// thinkingLessonStart — the ONE door between a surface and "Learn how to think".
//
// Everything a surface needs to run a lesson goes through here: which step this
// student is taught (from their KNOW record, tiers open by proof, red first),
// the boards it may be taught on, where an answer is recorded, and what happens
// when a lesson ends (Up next's bite closes, a tier that opened is celebrated
// and named). The page routes, speaks and renders; it decides none of this.
//
// Why one door: a surface that imports the planner, the source, the memory,
// the recorder and the evidence store separately is a surface that can wire
// them differently from the next one (the coach/third-coach divergence the
// surface-composition gate measures).
import type { LessonStage, StepStanding } from './thinkingLesson';
import type { AnsweredQuestion, StepKit } from './thinkingLessonSession';
import { getCapabilityProfile, type CapabilityProfile } from './capabilityEvidence';
import { chooseThinkingStep, openTier, tierUnlockLine, type BuiltStep, type StepChoice } from './thinkingLessonPlan';
import { recordThinkingAnswer, standingFromProfile } from './thinkingLessonRecord';
import { BUILT_THINKING_STEPS, tagsForThinkingStep } from './thinkingSteps.built';
import { loadLessonCandidates, type LessonUsernames } from './thinkingLessonSource';
import { getThinkingLessonMemory, rememberLessonBoard, seenFor } from './thinkingLessonMemory';
import { boardIdentity, pickFairPosition, type LessonPositionCandidate } from './thinkingPositions';
import { finishBite } from './activeBite';
import { reward } from './rewardService';
import { logAppAudit } from './appAuditor';

export type { StepKit, AnsweredQuestion, LessonStage, LessonUsernames, LessonPositionCandidate };
export type { LessonView } from './thinkingLessonSession';
// The session itself: a surface opens it through this door, never directly.
export { ThinkingLessonSession } from './thinkingLessonSession';

export interface PlannedLesson {
  kit: StepKit;
  reason: StepChoice['reason'];
  /** The tier that was open when the lesson started (for the unlock check). */
  openTier: number;
  candidates: LessonPositionCandidate[];
  available: (s: BuiltStep) => boolean;
}

async function knowProfile(): Promise<CapabilityProfile> {
  try { return await getCapabilityProfile('know'); } catch { return new Map(); }
}

/** Which step to teach this student now, and the boards to teach it on. Null
 *  when no step has a fair board for them yet (a fresh device with no games
 *  and no puzzles near their rating). */
export async function planThinkingLesson(opts: { usernames: LessonUsernames; rating: number }): Promise<PlannedLesson | null> {
  const [profile, candidates, memory] = await Promise.all([
    knowProfile(),
    loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
  ]);
  // Only steps this student has a FAIR board for can be served (a step that
  // needs their own games has none on a fresh device).
  const availability = new Map<BuiltStep, boolean>();
  const available = (s: BuiltStep): boolean => {
    const hit = availability.get(s);
    if (hit !== undefined) return hit;
    const k = s.kit();
    const adapt = k.adapt;
    const pool = adapt ? candidates.map((c) => adapt(c)).filter((c): c is LessonPositionCandidate => !!c) : candidates;
    const seen = seenFor(memory, k.step);
    // An engine-keyed step is judged after enrichment (below): here it only
    // needs a board it has not used.
    const ok = k.enrich
      ? pool.some((c) => !seen.has(boardIdentity(c.fen)))
      : pickFairPosition(pool, k.keyFor, seen) !== null;
    availability.set(s, ok);
    return ok;
  };
  // A step whose key needs the engine (`enrich`) cannot be judged available
  // up front: it counts as available while it has boards to try, and if none
  // of them enriches into a fair question it is ruled out and the choice is
  // made again.
  for (;;) {
    const choice = chooseThinkingStep(BUILT_THINKING_STEPS, (s) => standingFromProfile(profile, s.tags), available);
    if (!choice) return null;
    const kit = choice.step.kit();
    if (!kit.enrich) return { kit, reason: choice.reason, openTier: choice.openTier, candidates, available };
    const enriched = await enrichForLesson(kit, candidates, seenFor(memory, kit.step));
    if (enriched.length > 0) {
      return { kit, reason: choice.reason, openTier: choice.openTier, candidates: enriched, available };
    }
    availability.set(choice.step, false);
  }
}

/** Boards a lesson asks on: one Show, two Guide, one Solo. Enrichment stops
 *  once it has that many fair boards (the size of the exercise, not a cap on
 *  what the student hears). */
const LESSON_BOARDS = 4;

export async function enrichForLesson(
  kit: StepKit,
  candidates: readonly LessonPositionCandidate[],
  seen: ReadonlySet<string>,
): Promise<LessonPositionCandidate[]> {
  if (!kit.enrich) return [...candidates];
  const out: LessonPositionCandidate[] = [];
  for (const c of candidates) {
    if (out.length >= LESSON_BOARDS) break;
    if (seen.has(boardIdentity(c.fen))) continue;   // already used for this step
    const e = await kit.enrich(c);
    if (e && kit.keyFor(e.fen, e)) out.push(e);
  }
  return out;
}

/** The boards and memory a session needs for one step. */
export async function lessonInputs(kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }): Promise<{
  candidates: readonly LessonPositionCandidate[];
  seen: ReadonlySet<string>;
  standing: StepStanding;
}> {
  const [cands, memory, standing] = await Promise.all([
    opts.candidates ? Promise.resolve(opts.candidates) : loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
    lessonStepStanding(kit.step).catch((): StepStanding => 'grey'),
  ]);
  return { candidates: cands, seen: seenFor(memory, kit.step), standing };
}

/** Where every lesson answer goes (KNOW evidence on the step's tags). */
export function recordLessonAnswer(answer: AnsweredQuestion): Promise<void> {
  return recordThinkingAnswer(answer, tagsForThinkingStep(answer.step));
}

/** A step's standing on the KNOW reading. */
export async function lessonStepStanding(step: string): Promise<StepStanding> {
  return standingFromProfile(await knowProfile(), tagsForThinkingStep(step));
}

/** Remember a board the lesson used, so the next visit never repeats it. */
export function rememberLessonBoardNow(step: string, fen: string): Promise<void> {
  return rememberLessonBoard(step, fen, new Date().toISOString());
}

/**
 * A lesson ended. Up next's thinking bite closes (a no-op when none is open);
 * if the answers just written opened a tier, the reward fires, the audit row is
 * written, and the line the coach should say is returned.
 */
export async function finishThinkingLesson(plan: PlannedLesson, source: string): Promise<string | null> {
  void finishBite('thinking');
  try {
    const after = await knowProfile();
    const opened = tierUnlockLine(plan.openTier, openTier(BUILT_THINKING_STEPS, (s) => standingFromProfile(after, s.tags), plan.available));
    if (!opened) return null;
    reward({ kind: 'rankUp', label: opened.label, seed: opened.tier });
    void logAppAudit({
      kind: 'thinking-tier-unlocked',
      category: 'subsystem',
      source,
      summary: `tier ${opened.tier} opened after ${plan.kit.step}`,
      details: JSON.stringify({ tier: opened.tier, fromTier: plan.openTier, step: plan.kit.step }),
    });
    return opened.line;
  } catch {
    return null;   // the lesson already ran; the unlock waits for next time
  }
}
