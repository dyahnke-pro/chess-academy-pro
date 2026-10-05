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
import { chooseThinkingStep, gameWeightForTags, openTier, tierUnlockLine, type BuiltStep, type StepChoice } from './thinkingLessonPlan';
import { heatMap, type HeatTile } from './heatMap';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';
import { recordThinkingAnswer, standingFromProfile } from './thinkingLessonRecord';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { BUILT_THINKING_STEPS, tagsForThinkingStep } from './thinkingSteps.built';
import { TAG_STEP } from './thinkingSteps';
import { getMisconceptionsForGame } from './misconceptionService';
import type { MisconceptionTagRecord } from '../types';
import { loadLessonCandidates, type LessonUsernames } from './thinkingLessonSource';
import { getThinkingLessonMemory, rememberLessonBoard, seenFor } from './thinkingLessonMemory';
import { boardIdentity, isFairKey, pickFairPosition, type LessonPositionCandidate } from './thinkingPositions';
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
  const [profile, useProfile, weaknesses, loaded, memory] = await Promise.all([
    knowProfile(),
    getCapabilityProfile('use').catch((): CapabilityProfile => new Map()),
    getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
    loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
  ]);
  // What the student's GAMES say (the heat map Up next reads): which steps
  // they keep failing, and the boards they failed them on.
  const tiles: HeatTile[] = heatMap(useProfile, weaknesses);
  const candidates = withWeaknessBoards(loaded, weaknesses);
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
    const choice = chooseThinkingStep(
      BUILT_THINKING_STEPS,
      (s) => standingFromProfile(profile, s.tags),
      available,
      (s) => gameWeightForTags(tiles, s.tags),
    );
    if (!choice) return null;
    const kit = choice.step.kit();
    // The student's own failures at THIS step first (the board they hung the
    // knight on teaches "am I safe?" better than any puzzle).
    const ordered = boardsForStep(candidates, weaknesses, choice.step.tags);
    if (!kit.enrich) return { kit, reason: choice.reason, openTier: choice.openTier, candidates: ordered, available };
    const enriched = await enrichForLesson(kit, ordered, seenFor(memory, kit.step));
    if (enriched.length > 0) {
      return { kit, reason: choice.reason, openTier: choice.openTier, candidates: enriched, available };
    }
    availability.set(choice.step, false);
  }
}

/** The weakness spine's own positions join the pool as game boards (the
 *  board before the student's slip, with the move they played), so a step
 *  can be taught on the exact position the student failed it on. */
export function withWeaknessBoards(
  candidates: readonly LessonPositionCandidate[],
  weaknesses: readonly UnifiedWeakness[],
): LessonPositionCandidate[] {
  const out = [...candidates];
  const have = new Set(out.map((c) => boardIdentity(c.fen)));
  for (const w of weaknesses) {
    for (const p of w.positions) {
      const id = boardIdentity(p.fen);
      if (have.has(id)) continue;
      have.add(id);
      out.push({ fen: p.fen, origin: 'game', ...(p.playedSan ? { playedSan: p.playedSan } : {}) });
    }
  }
  return out;
}

/** Boards for a step: the positions of weaknesses filed under the step's tags
 *  first (newest first, as the spine orders them), then everything else in
 *  its own order. A reorder, never a filter — a step with no matching hole
 *  still has the rest of the pool. PURE. */
export function boardsForStep(
  candidates: readonly LessonPositionCandidate[],
  weaknesses: readonly UnifiedWeakness[],
  tags: readonly MisconceptionTagId[],
): LessonPositionCandidate[] {
  const rank = new Map<string, number>();
  let n = 0;
  for (const w of weaknesses) {
    if (!w.capabilityTag || !tags.includes(w.capabilityTag)) continue;
    for (const p of w.positions) {
      const id = boardIdentity(p.fen);
      if (!rank.has(id)) rank.set(id, n++);
    }
  }
  if (rank.size === 0) return [...candidates];
  const first = candidates.filter((c) => rank.has(boardIdentity(c.fen)))
    .sort((a, b) => (rank.get(boardIdentity(a.fen)) ?? 0) - (rank.get(boardIdentity(b.fen)) ?? 0));
  const rest = candidates.filter((c) => !rank.has(boardIdentity(c.fen)));
  return [...first, ...rest];
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

/**
 * The step the lesson WOULD teach, for a card that only shows it (Up next):
 * the same chooser, the same KNOW standing and the same game weighting the
 * lesson uses, so the card and the lesson can never disagree. Every step
 * counts as available (the card does not load boards).
 */
export async function lessonStepForCard(tiles: readonly HeatTile[]): Promise<StepChoice | null> {
  const profile = await knowProfile();
  return chooseThinkingStep(
    BUILT_THINKING_STEPS,
    (s) => standingFromProfile(profile, s.tags),
    () => true,
    (s) => gameWeightForTags(tiles, s.tags),
  );
}

/** One step's kit, for a surface that asks a single lesson question on its own
 *  board (the Setup Trainer's first miss). Null for a step with no kit. */
export function kitForStep(step: string): StepKit | null {
  const b = BUILT_THINKING_STEPS.find((s) => s.step === step);
  return b ? b.kit() : null;
}

/**
 * THE REVIEW'S QUESTION AT A SLIP. Game analysis already filed each slip under
 * a tag at its board; the tag names the step whose habit would have caught it
 * (`TAG_STEP`, the one join). So the review asks THAT step's question on the
 * board before the move — "am I safe?" where they hung a piece, "where are
 * their targets?" where they missed a loose one.
 *
 * Silent (no entry) when the game has no tag at that board, no step trains the
 * tag (a fundamentals hole), no step that does has a kit, the step needs the engine to
 * key it (`enrich` — too slow to stop a walk on), or the board poses no fair
 * question for it. PURE over the rows.
 */
export function slipStepsForBoards(
  rows: readonly Pick<MisconceptionTagRecord, 'tag' | 'fen'>[],
  boards: readonly { ply: number; fen: string }[],
): Map<number, string> {
  const tagAt = new Map<string, string>();
  for (const r of rows) {
    const id = boardIdentity(r.fen);
    if (!tagAt.has(id)) tagAt.set(id, r.tag);
  }
  const out = new Map<number, string>();
  for (const b of boards) {
    const tag = tagAt.get(boardIdentity(b.fen));
    if (!tag || !Object.prototype.hasOwnProperty.call(TAG_STEP, tag)) continue;
    const t = tag as MisconceptionTagId;
    // The tag's LEAD step first, then every other step that trains the tag, in
    // routine order: the first one with a fair question on this board asks it
    // (a piece their move hung is "is my move safe?", not "am I safe?").
    const lead = TAG_STEP[t];
    const trainers = BUILT_THINKING_STEPS.filter((s) => s.tags.includes(t)).sort((x, y) => x.order - y.order).map((s) => s.step);
    for (const step of lead ? [lead, ...trainers.filter((s) => s !== lead)] : trainers) {
      const kit = kitForStep(step);
      if (!kit || kit.enrich || !isFairKey(kit.keyFor(b.fen))) continue;
      out.set(b.ply, step);
      break;
    }
  }
  return out;
}

/** `slipStepsForBoards` over one game's recorded slips. */
export async function slipStepsForGame(gameId: string, boards: readonly { ply: number; fen: string }[]): Promise<Map<number, string>> {
  if (boards.length === 0) return new Map();
  try {
    return slipStepsForBoards(await getMisconceptionsForGame(gameId), boards);
  } catch {
    return new Map();
  }
}
