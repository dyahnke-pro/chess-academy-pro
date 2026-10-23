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
import { gameDateMs } from '../utils/gameDate';
import type { StepStanding } from './thinkingLesson';
import type { AnsweredQuestion, LessonProgress, StepKit } from './thinkingLessonSession';
import { summariseEvidence, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { chooseThinkingStep, gameWeightForTags, lessonCloseLine, mixable, openTier, tierUnlockLine, type BuiltStep, type StepChoice } from './thinkingLessonPlan';
import { heatMap, type HeatTile } from './heatMap';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';
import { recordThinkingAnswer, stepStanding } from './thinkingLessonRecord';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { BUILT_THINKING_STEPS, tagsForThinkingStep } from './thinkingSteps.built';
import { TAG_STEP, foldForSteps, stepTagOf } from './thinkingSteps';
import { getMisconceptionsForGame } from './misconceptionService';
import type { MisconceptionTagRecord } from '../types';
import { loadLessonCandidates, type LessonUsernames } from './thinkingLessonSource';
import { countAskedBoard, getThinkingLessonMemory, rememberLessonBoard, resumeFor, saveLessonResume, seenFor, type LessonResume } from './thinkingLessonMemory';
import { MIXED_INTRO, MIXED_STEP, choiceAnswerDetail, mixedBoards, tailBoards, type StepChoiceAnswer } from './thinkingMixedRound';
import { recordAnswer } from './answerRecord';
import { boardIdentity, isEmptyKey, isFairKey, pickFairPosition, type LessonPositionCandidate } from './thinkingPositions';
import { finishBite } from './activeBite';
import type { KeyScorer } from './thinkingKeyCheck';
import { ENGINE_KEY_SCORER } from './thinkingKeyScorer';
import { reward } from './rewardService';
import { logAppAudit } from './appAuditor';
import { db } from '../db/schema';
import { isFixtureDerived, isFixtureGame } from './fixtureGames';
import {
  thinkingTransfer, transferCounts, transferGapLine, worstGap,
  type StepTransfer, type TransferGame, type TransferSlip,
} from './thinkingTransfer';
import { emitThinkingTransfer } from './thinkingTransferEvents';

export type { StepKit, LessonUsernames, LessonPositionCandidate };
export type { LessonView } from './thinkingLessonSession';
// The session itself: a surface opens it through this door, never directly.
export { ThinkingLessonSession, IDLE_LESSON_VIEW } from './thinkingLessonSession';
// A typed or spoken "nothing here" (the hook reads answers through this door).
export { isNothingAnswer } from './thinkingLesson';
// Pattern Recognition asks step 5 about one motif on its example board.
export { motifKit, type MotifBoard } from './thinkingMotifStep';

export interface PlannedLesson {
  kit: StepKit;
  reason: StepChoice['reason'];
  /** The tier that was open when the lesson started (for the unlock check). */
  openTier: number;
  candidates: LessonPositionCandidate[];
  available: (s: BuiltStep) => boolean;
  /** A MIXED round (plan D6): the proven steps' kits. `kit` is then the
   *  round's own (`mixedRoundKit`, step `mixed`). */
  mix?: StepKit[];
  /** Every built step's standing when the lesson was planned — the close
   *  names what turned green against it. */
  standingBefore: ReadonlyMap<string, StepStanding>;
  /** How badly the student's games fail a step (the chooser's game term),
   *  so the close names the same next step the chooser would pick. */
  gameWeight: (s: BuiltStep) => number;
  /** Steps known in lessons that the games still miss — never served again
   *  as a lesson (`thinkingTransfer`), in the close's "next" too. Optional so
   *  a hand-built plan (tests) needs none. */
  habitPending?: (s: BuiltStep) => boolean;
  /** The lesson's TAIL (2026-10-23): once a second step has been taught, the
   *  lesson closes on unlabeled boards from the earlier ones — the kits the
   *  student chooses between (this step's and the earlier steps') and their
   *  engine-checked pool. Absent: nothing taught before, or no board. */
  tail?: { kits: StepKit[]; candidates: LessonPositionCandidate[] };
}

/** The kit a mixed round runs under: its step id, its intro. Each board's
 *  question comes from the step the student's choice is graded under, so this
 *  kit itself keys nothing. */
export function mixedRoundKit(): StepKit {
  return {
    step: MIXED_STEP,
    keyFor: () => null,
    showLine: () => '',
    prompt: () => '',
    wrongTapLine: () => '',
    reasonFor: () => null,
    intro: MIXED_INTRO,
  };
}

/** Every evidence row — a step's standing reads its OWN answers out of these
 *  (`stepStanding`), never the shared tag profile. */
async function evidenceRows(): Promise<CapabilityEvidenceRecord[]> {
  try { return await db.capabilityEvidence.toArray(); } catch { return []; }
}

/** The one standing reader every chooser here uses. */
const standingIn = (rows: readonly CapabilityEvidenceRecord[]) => (s: BuiltStep): StepStanding => stepStanding(rows, s.step);

/** Which step to teach this student now, and the boards to teach it on. Null
 *  when no step has a fair board for them yet (a fresh device with no games
 *  and no puzzles near their rating). */
export async function planThinkingLesson(opts: { usernames: LessonUsernames; rating: number; beginner?: boolean }): Promise<PlannedLesson | null> {
  const [evidence, weaknesses, loaded, memory, transfer] = await Promise.all([
    evidenceRows(),
    getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
    loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
    loadThinkingTransfer(),
  ]);
  const slips = await db.misconceptionTags.toArray().catch(() => []);
  const pending = habitPendingFrom(transfer);
  // What the student's GAMES say (the heat map Up next reads): which steps
  // they keep failing, and the boards they failed them on.
  const tiles: HeatTile[] = heatMap(evidence, slips);
  const candidates = withWeaknessBoards(loaded, weaknesses);
  // Only steps this student has a FAIR board for can be served (a step that
  // needs their own games has none on a fresh device).
  const availability = new Map<BuiltStep, boolean>();
  const standingOf = standingIn(evidence);
  const beginnerOk = beginnerAllows(!!opts.beginner, standingOf);
  const available = (s: BuiltStep): boolean => {
    if (!beginnerOk(s)) return false;
    const hit = availability.get(s);
    if (hit !== undefined) return hit;
    const k = s.kit();
    const adapt = k.adapt;
    const pool = adapt ? candidates.map((c) => adapt(c)).filter((c): c is LessonPositionCandidate => !!c) : candidates;
    const seen = seenFor(memory, k.step);
    // An engine-keyed step is judged after enrichment (below): here it only
    // needs a board it has not used.
    // Availability is a SEARCH: the static key says a board might pose the
    // question; the engine check (below, once the step is chosen) decides.
    const ok = k.enrich
      ? pool.some((c) => !seen.has(boardIdentity(c.fen)))
      : pickFairPosition(pool, searchKeyOf(k), seen) !== null;
    availability.set(s, ok);
    return ok;
  };
  // A step whose key needs the engine (`enrich`) cannot be judged available
  // up front: it counts as available while it has boards to try, and if none
  // of them enriches into a fair question it is ruled out and the choice is
  // made again.
  const gameWeight = (s: BuiltStep): number => gameWeightForTags(tiles, s.tags);
  const standingBefore = new Map(BUILT_THINKING_STEPS.map((s) => [s.step, standingOf(s)] as const));
  const common = { available, standingBefore, gameWeight, habitPending: pending };
  for (;;) {
    const choice = chooseThinkingStep(BUILT_THINKING_STEPS, standingOf, available, gameWeight, pending);
    if (!choice) return null;
    // A MIXED round needs two boards that each ask a proven step's question;
    // short of that, the first proven step comes back as a review.
    if (choice.reason === 'mixed' && choice.mix) {
      const kits = choice.mix.map((s) => s.kit());
      const mixSeen = seenFor(memory, MIXED_STEP);
      const pool = await checkForMix(kits, boardsForStep(candidates, weaknesses, choice.mix.flatMap((s) => s.tags), !!opts.beginner), mixSeen);
      if (mixedBoards(kits, pool, mixSeen).length >= 2) {
        return { kit: mixedRoundKit(), reason: 'mixed', openTier: choice.openTier, candidates: pool, mix: kits, ...common };
      }
    }
    const reason: StepChoice['reason'] = choice.reason === 'mixed' ? 'review' : choice.reason;
    const kit = choice.step.kit();
    // The student's own failures at THIS step first (the board they hung the
    // knight on teaches "am I safe?" better than any puzzle).
    const ordered = boardsForStep(candidates, weaknesses, choice.step.tags, !!opts.beginner);
    const ready = kit.enrich
      ? await enrichForLesson(kit, ordered, seenFor(memory, kit.step))
      : await checkForLesson(kit, ordered, seenFor(memory, kit.step));
    if (ready.length > 0) {
      const tail = await lessonTail(choice.step, kit, evidence, available, candidates, weaknesses, seenFor(memory, MIXED_STEP));
      return { kit, reason, openTier: choice.openTier, candidates: ready, ...common, ...(tail ? { tail } : {}) };
    }
    // No board survived the engine (or enrichment): rule the step out and choose again.
    availability.set(choice.step, false);
  }
}

/**
 * THE TAIL (David 2026-10-23: "mix from the 2nd step taught"). The steps this
 * student has been taught before (they have answered that step's own question
 * at least once) that can be asked on a plain board, plus today's step when it
 * can — at least two to choose between — and a pool checked for each. Null
 * when nothing has been taught before or no board fits.
 */
async function lessonTail(
  today: BuiltStep,
  kit: StepKit,
  evidence: readonly CapabilityEvidenceRecord[],
  available: (s: BuiltStep) => boolean,
  candidates: readonly LessonPositionCandidate[],
  weaknesses: readonly UnifiedWeakness[],
  seen: ReadonlySet<string>,
): Promise<PlannedLesson['tail'] | null> {
  const taught = BUILT_THINKING_STEPS.filter((s) =>
    s.step !== today.step && mixable(s) && available(s) && evidence.some((r) => r.answer?.questionId === s.step));
  if (taught.length === 0) return null;
  const kits = [...(mixable(today) ? [kit] : []), ...taught.map((s) => s.kit())];
  if (kits.length < 2) return null;
  const pool = await checkForMix(kits, boardsForStep(candidates, weaknesses, taught.flatMap((s) => s.tags)), seen);
  return tailBoards(kits, today.step, pool, seen).length > 0 ? { kits, candidates: pool } : null;
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
  quiet = false,
): LessonPositionCandidate[] {
  // A beginner sees QUIET boards first (fewest pieces): difficulty only, never
  // how much the coach says. Their own failures still lead.
  const byQuiet = (list: LessonPositionCandidate[]): LessonPositionCandidate[] =>
    (quiet ? [...list].sort((a, b) => menOnBoard(a.fen) - menOnBoard(b.fen)) : list);
  const rank = new Map<string, number>();
  let n = 0;
  for (const w of weaknesses) {
    if (!w.capabilityTag || !tags.includes(stepTagOf(w.capabilityTag))) continue;
    for (const p of w.positions) {
      const id = boardIdentity(p.fen);
      if (!rank.has(id)) rank.set(id, n++);
    }
  }
  if (rank.size === 0) return byQuiet([...candidates]);
  const first = candidates.filter((c) => rank.has(boardIdentity(c.fen)))
    .sort((a, b) => (rank.get(boardIdentity(a.fen)) ?? 0) - (rank.get(boardIdentity(b.fen)) ?? 0));
  const rest = candidates.filter((c) => !rank.has(boardIdentity(c.fen)));
  return [...first, ...byQuiet(rest)];
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

// ─── THE ENGINE CHECK (2026-10-23) ─────────────────────────────────────────
// A kit whose key claims material (`check`) is asked only on boards the engine
// passed for it; the gate is in the built kits (`thinkingSteps.built`), the
// checking is here, so every surface reaches a checked board through this door.

let keyScorer: KeyScorer = ENGINE_KEY_SCORER;

/** Test seam: an engine stand-in for the key check (null restores the engine). */
export function setKeyScorerForTests(s: KeyScorer | null): void {
  keyScorer = s ?? ENGINE_KEY_SCORER;
  verdicts.clear();
}

/** Verdicts already read this session (a board asked about twice — the Setup
 *  Trainer picks its step, then asks it — costs the engine once). */
const verdicts = new Map<string, boolean>();
const VERDICTS_KEPT = 500;
function remember(id: string, ok: boolean): void {
  if (verdicts.size >= VERDICTS_KEPT) verdicts.delete(verdicts.keys().next().value as string);
  verdicts.set(id, ok);
}

/** The static key, for SEARCHING boards (never asked). */
const searchKeyOf = (kit: StepKit): StepKit['keyFor'] => kit.searchKeyFor ?? kit.keyFor;

/** Boards a check tries per lesson before giving up on the pool (the engine's
 *  time is the student's wait). Not a cap on teaching: a lesson asks 3–4. */
const CHECK_TRIES = 16;

/**
 * One board, checked for one kit: the candidate with the engine's verdict filed
 * under the step (`checked`), or null when the board does not pose the
 * question fairly or the engine disagrees with its key. A kit with no check
 * passes the board through. A step that replays the student's move (`adapt`)
 * is checked on the board it will ask on, and the verdict rides the original.
 */
export async function checkBoard(kit: StepKit, c: LessonPositionCandidate): Promise<LessonPositionCandidate | null> {
  if (!kit.check) return c;
  const filed = c.checked?.[kit.step];
  if (filed !== undefined) return filed ? c : null;
  const asked = kit.adapt ? kit.adapt(c) : c;
  if (!asked) return null;
  let key = null;
  try { key = searchKeyOf(kit)(asked.fen, asked); } catch { key = null; }
  // A board with no answer is checked too ("nothing here" must be true).
  if (!isFairKey(key) && !(kit.nothing && isEmptyKey(key))) return null;
  const id = `${kit.step}|${boardIdentity(asked.fen)}`;
  const known = verdicts.get(id);
  if (known !== undefined) return known ? { ...c, checked: { ...(c.checked ?? {}), [kit.step]: true } } : null;
  const ok = await kit.check(asked.fen, key.key, keyScorer).catch(() => false);
  remember(id, ok);
  void logAppAudit({
    kind: 'thinking-key-check',
    category: 'subsystem',
    source: 'thinkingLessonStart.checkBoard',
    summary: `${kit.step} ${ok ? 'passed' : 'dropped'} key=${key.key.join(',')} origin=${c.origin}`,
  });
  return ok ? { ...c, checked: { ...(c.checked ?? {}), [kit.step]: true } } : null;
}

/** The boards a lesson on this kit may ask on, engine-checked: own games
 *  first, never a board already used, stopping once there are enough. */
export async function checkForLesson(
  kit: StepKit,
  candidates: readonly LessonPositionCandidate[],
  seen: ReadonlySet<string>,
): Promise<LessonPositionCandidate[]> {
  if (!kit.check) return [...candidates];
  const ordered = [...candidates.filter((c) => c.origin === 'game'), ...candidates.filter((c) => c.origin === 'puzzle')];
  const out: LessonPositionCandidate[] = [];
  let empties = 0;
  let tries = 0;
  for (const c of ordered) {
    if ((out.length - empties >= LESSON_BOARDS && (!kit.nothing || empties >= EMPTY_BOARDS)) || tries >= CHECK_TRIES) break;
    if (seen.has(boardIdentity(c.fen))) continue;
    const asked = kit.adapt ? kit.adapt(c) : c;
    if (!asked) continue;
    const key = searchKeyOf(kit)(asked.fen, asked);
    // The empty boards the step may serve ("nothing here"), checked like the rest.
    const empty = !!kit.nothing && isEmptyKey(key);
    if (empty ? empties >= EMPTY_BOARDS : (!isFairKey(key) || out.length - empties >= LESSON_BOARDS)) continue;
    tries += 1;
    const ok = await checkBoard(kit, c);
    if (ok) { out.push(ok); if (empty) empties += 1; }
  }
  return out;
}

/** Empty boards kept ready per lesson (a lesson asks at most one, 1 in 8). */
const EMPTY_BOARDS = 1;

/** A mixed round's pool, with each board checked for every step whose question
 *  it might ask (a step the engine disagrees with does not apply there). */
export async function checkForMix(
  kits: readonly StepKit[],
  candidates: readonly LessonPositionCandidate[],
  seen: ReadonlySet<string>,
): Promise<LessonPositionCandidate[]> {
  const ordered = [...candidates.filter((c) => c.origin === 'game'), ...candidates.filter((c) => c.origin === 'puzzle')];
  const out: LessonPositionCandidate[] = [];
  let tries = 0;
  for (const c of ordered) {
    if (out.length >= kits.length * 2 || tries >= CHECK_TRIES * 2) break;
    if (seen.has(boardIdentity(c.fen))) continue;
    let board: LessonPositionCandidate = c;
    let applies = false;
    for (const k of kits) {
      if (!isFairKey(searchKeyOf(k)(board.fen, board))) continue;
      if (!k.check) { applies = true; continue; }
      tries += 1;
      const ok = await checkBoard(k, board);
      if (ok) { board = ok; applies = true; }
      else board = { ...board, checked: { ...(board.checked ?? {}), [k.step]: false } };
    }
    if (applies) out.push(board);
  }
  return out;
}

/** The pool read again when a lesson runs dry mid-way: by then the boot
 *  puzzle seed has had time, and the refill waits for it longer. The boards
 *  are checked for the lesson's kit like the first ones. */
export async function refillLessonCandidates(
  opts: { usernames: LessonUsernames; rating: number },
  kit?: StepKit,
  seen: ReadonlySet<string> = new Set(),
): Promise<LessonPositionCandidate[]> {
  const startedAt = Date.now();
  const loaded = await loadLessonCandidates({ ...opts, seedWaitMs: 45_000 }).catch((): LessonPositionCandidate[] => []);
  const out = kit ? await checkForLesson(kit, loaded, seen) : loaded;
  // Observable: a lesson that ran dry, and what the refill found.
  void logAppAudit({
    kind: 'thinking-lesson-refill',
    category: 'subsystem',
    source: 'thinkingLessonStart.refill',
    summary: `refill rating=${opts.rating} boards=${out.length} games=${out.filter((c) => c.origin === 'game').length} ms=${Date.now() - startedAt}`,
  });
  return out;
}

/** The boards and memory a session needs for one step. */
export async function lessonInputs(kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }): Promise<{
  candidates: readonly LessonPositionCandidate[];
  seen: ReadonlySet<string>;
  standing: StepStanding;
  /** Where this step's last lesson stopped, if it did not finish (plan D8). */
  resume: LessonResume | null;
}> {
  const [loaded, memory, standing] = await Promise.all([
    opts.candidates ? Promise.resolve(opts.candidates) : loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
    lessonStepStanding(kit.step).catch((): StepStanding => 'grey'),
  ]);
  const seen = seenFor(memory, kit.step);
  // Boards from the plan are already checked (their verdict is filed); any
  // other pool is checked here, so no path reaches the session unchecked.
  const candidates = await checkForLesson(kit, loaded, seen);
  return { candidates, seen, standing, resume: resumeFor(memory, kit.step) };
}

/** Where a running lesson is (null: it ran to its end), so a stopped lesson
 *  resumes at the board it was on. */
export function saveLessonProgress(p: LessonProgress | null): Promise<void> {
  return saveLessonResume(p, new Date().toISOString());
}

/** A mixed round's step choice, recorded through the one answer recorder on
 *  the tags of the step the board was graded under: the right pick when the
 *  student chose one that applies, else the step it does ask. */
export async function recordLessonChoice(choice: StepChoiceAnswer): Promise<void> {
  for (const tag of tagsForThinkingStep(choice.graded)) {
    await recordAnswer({ questionTag: tag, fen: choice.fen, origin: 'lesson', solved: choice.right, answer: choiceAnswerDetail(choice) });
  }
}

/** Where every lesson answer goes (KNOW evidence on the step's tags). */
export function recordLessonAnswer(answer: AnsweredQuestion): Promise<void> {
  return recordThinkingAnswer(answer, tagsForThinkingStep(answer.step));
}

/** A step's standing on the KNOW reading. */
async function lessonStepStanding(step: string): Promise<StepStanding> {
  return stepStanding(await evidenceRows(), step);
}

/** One more asked board, across lessons — its ordinal decides whether it is a
 *  board with no answer (`isEmptySlot`). */
export function countLessonBoardAsked(): Promise<number> {
  return countAskedBoard();
}

/** Remember a board the lesson used, so the next visit never repeats it. */
export function rememberLessonBoardNow(step: string, fen: string): Promise<void> {
  return rememberLessonBoard(step, fen, new Date().toISOString());
}

/**
 * A lesson ended (plan D8). Up next's thinking bite closes (a no-op when none
 * is open), and the CLOSE is computed from the record the answers just wrote:
 * which steps turned green, whether a tier opened (the reward fires and the
 * audit row is written), and the step the chooser would pick next. Returns the
 * line the coach should say — praise only where it was earned.
 */
export async function finishThinkingLesson(
  plan: PlannedLesson,
  source: string,
  /** `stopped`: the student ended it part-way — it resumes there next time,
   *  so the close names what was proven and no "next". */
  opts: { stopped?: boolean } = {},
): Promise<string | null> {
  void finishBite('thinking');
  try {
    const standingAfter = standingIn(await evidenceRows());
    const opened = tierUnlockLine(plan.openTier, openTier(BUILT_THINKING_STEPS, standingAfter, plan.available));
    if (opened) {
      reward({ kind: 'rankUp', label: opened.label, seed: opened.tier });
      void logAppAudit({
        kind: 'thinking-tier-unlocked',
        category: 'subsystem',
        source,
        summary: `tier ${opened.tier} opened after ${plan.kit.step}`,
        details: JSON.stringify({ tier: opened.tier, fromTier: plan.openTier, step: plan.kit.step }),
      });
    }
    const proven = BUILT_THINKING_STEPS
      .filter((s) => plan.standingBefore.get(s.step) !== 'green' && standingAfter(s) === 'green')
      .map((s) => s.step);
    const next = opts.stopped ? null : chooseThinkingStep(BUILT_THINKING_STEPS, standingAfter, plan.available, plan.gameWeight, plan.habitPending);
    const close = lessonCloseLine({
      step: plan.kit.step,
      proven,
      tierLine: opened?.line ?? null,
      next,
      key: plan.openTier + proven.length,
    });
    // No tier opened: if a step they KNOW has not reached their games, the
    // close names that gap (the lesson game that follows is where it is drilled).
    const gap = opened ? null : worstGap(await loadThinkingTransfer());
    const gapLine = gap ? transferGapLine(gap) : null;
    return [close, gapLine].filter(Boolean).join(' ') || null;
  } catch {
    return null;   // the lesson already ran; the close waits for next time
  }
}

/**
 * The step the lesson WOULD teach, for a card that only shows it (Up next):
 * the same chooser, the same KNOW standing and the same game weighting the
 * lesson uses, so the card and the lesson can never disagree. Every step
 * counts as available (the card does not load boards).
 */
export async function lessonStepForCard(
  tiles: readonly HeatTile[],
  beginner = false,
  transfer?: readonly StepTransfer[],
): Promise<StepChoice | null> {
  const [rows, read] = await Promise.all([evidenceRows(), transfer ? Promise.resolve(transfer) : loadThinkingTransfer()]);
  const standingOf = standingIn(rows);
  return chooseThinkingStep(
    BUILT_THINKING_STEPS,
    standingOf,
    beginnerAllows(beginner, standingOf),
    (s) => gameWeightForTags(tiles, s.tags),
    habitPendingFrom(read),
  );
}

/** A known step whose games still slip is not served as a lesson. PURE. */
export function habitPendingFrom(transfer: readonly StepTransfer[]): (s: BuiltStep) => boolean {
  const pending = new Set(transfer.filter((t) => t.cls === 'known-not-used').map((t) => t.step));
  return (s) => pending.has(s.step);
}

/** An unchanged reading is reported once per window, not once per read (the
 *  card, the planner and the close each read it) — the heat map's rule. */
const TRANSFER_REPEAT_WINDOW_MS = 5000;
let lastTransfer: { details: string; at: number } | null = null;

/** Test seam: forget the last emitted reading. */
export function resetTransferReportForTests(): void {
  lastTransfer = null;
}

/**
 * THE TRANSFER READING, from the record (the I/O door around the pure
 * `thinkingTransfer`): every capability row, every slip game analysis filed in
 * the student's own (non-demo) games, and when each of those games was PLAYED.
 * The games read over are the ANALYSED ones — a game is in the denominator
 * only when analysis wrote something about it (a slip or a capability row), so
 * an unanalysed import never reads as a clean game. Emits the distribution.
 */
export async function loadThinkingTransfer(): Promise<StepTransfer[]> {
  try {
    const [evidence, slipRows, games] = await Promise.all([
      db.capabilityEvidence.toArray(),
      db.misconceptionTags.toArray(),
      db.games.toArray(),
    ]);
    const analysed = new Set<string>();
    const slips: TransferSlip[] = [];
    for (const r of slipRows) {
      if (!r.sourceGameId || isFixtureDerived(r) || r.counted === false) continue;
      analysed.add(r.sourceGameId);
      slips.push({ tag: r.tag, gameId: r.sourceGameId });
    }
    for (const r of evidence) if (r.sourceGameId) analysed.add(r.sourceGameId);
    const played: TransferGame[] = [];
    for (const g of games) {
      if (g.isMasterGame || isFixtureGame(g) || !analysed.has(g.id)) continue;
      const at = gamePlayedAt(g.date);
      if (at !== null) played.push({ id: g.id, playedAt: at });
    }
    const out = thinkingTransfer({ evidence, useProfile: summariseEvidence(foldForSteps(evidence), foldForSteps(slipRows), {}, 'use'), games: played, slips });
    reportTransfer(out, played.length);
    return out;
  } catch {
    return [];   // no store yet: nothing is known, nothing transferred
  }
}

/** A game's date as ms: PGN "2024.05.01" or an ISO string. Null when it is not
 *  a date — such a game is left out rather than placed on the wrong side. */
export function gamePlayedAt(date: string | null | undefined): number | null {
  return gameDateMs(date) ?? null;
}

function reportTransfer(all: readonly StepTransfer[], games: number): void {
  const row = {
    counts: transferCounts(all),
    games,
    steps: all.map((t) => ({
      step: t.step, cls: t.cls, greenAt: t.greenAt,
      beforeGames: t.before.games, beforeSlips: t.before.slips,
      afterGames: t.after.games, afterSlips: t.after.slips, useProven: t.useProven,
    })),
  };
  const details = JSON.stringify(row);
  const now = Date.now();
  if (lastTransfer && lastTransfer.details === details && now - lastTransfer.at < TRANSFER_REPEAT_WINDOW_MS) return;
  lastTransfer = { details, at: now };
  emitThinkingTransfer(row);
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
  rows: readonly Pick<MisconceptionTagRecord, 'tag' | 'fen' | 'setup'>[],
  boards: readonly { ply: number; fen: string }[],
): Map<number, string> {
  const tagAt = new Map<string, string>();
  for (const r of rows) {
    // A board's question comes from its own slip, never the set-up half.
    if (r.setup) continue;
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
    const trainers = BUILT_THINKING_STEPS.filter((s) => s.tags.includes(stepTagOf(t))).sort((x, y) => x.order - y.order).map((s) => s.step);
    for (const step of lead ? [lead, ...trainers.filter((s) => s !== lead)] : trainers) {
      const kit = kitForStep(step);
      if (!kit || kit.enrich || !isFairKey(searchKeyOf(kit)(b.fen))) continue;
      out.set(b.ply, step);
      break;
    }
  }
  return out;
}

/** `slipStepsForBoards` over one game's recorded slips, each engine-checked
 *  (a slip whose step the engine disagrees with on that board asks nothing). */
export async function slipStepsForGame(gameId: string, boards: readonly { ply: number; fen: string }[]): Promise<Map<number, string>> {
  if (boards.length === 0) return new Map();
  try {
    const found = slipStepsForBoards(await getMisconceptionsForGame(gameId), boards);
    const fenAt = new Map(boards.map((b) => [b.ply, b.fen] as const));
    const out = new Map<number, string>();
    for (const [ply, step] of found) {
      const kit = kitForStep(step);
      const fen = fenAt.get(ply);
      if (kit && fen && (await checkBoard(kit, { fen, origin: 'game', gameId, ply }))) out.set(ply, step);
    }
    return out;
  } catch {
    return new Map();
  }
}

/** The first of these steps that poses a fair, engine-checked question on this
 *  board (routine order as given), or null. For a surface asking ONE question
 *  on its own board: the Setup Trainer's first miss asks "am I safe?" when
 *  something of yours hangs there, else "their targets". */
export async function firstFairKit(steps: readonly string[], fen: string): Promise<StepKit | null> {
  for (const step of steps) {
    const kit = kitForStep(step);
    if (!kit || kit.enrich || !isFairKey(searchKeyOf(kit)(fen))) continue;
    if (await checkBoard(kit, { fen, origin: 'game' })) return kit;
  }
  return null;
}

/** One live board as a lesson board for this kit — engine-checked — or null
 *  (the lesson game's moment, a surface's single question). */
export function liveBoard(kit: StepKit, fen: string): Promise<LessonPositionCandidate | null> {
  return checkBoard(kit, { fen, origin: 'game' });
}

/** The key a kit WOULD ask on a board, before the engine (for searching and
 *  for "was it just said?" — never to grade). */
export function searchKey(kit: StepKit, fen: string): readonly string[] {
  try { return searchKeyOf(kit)(fen)?.key ?? []; } catch { return []; }
}

/** The steps a beginner starts on (plan "Beginner mode": steps 2–3). */
const BEGINNER_STEPS: readonly string[] = ['their-move-changed', 'am-i-safe'];

/** A beginner is taught only the beginner steps until BOTH are green; then the
 *  routine opens as for anyone. Everyone else: every step. PURE. */
export function beginnerAllows(beginner: boolean, standingOf: (s: BuiltStep) => StepStanding): (s: BuiltStep) => boolean {
  if (!beginner) return () => true;
  const firsts = BUILT_THINKING_STEPS.filter((s) => BEGINNER_STEPS.includes(s.step));
  if (firsts.length > 0 && firsts.every((s) => standingOf(s) === 'green')) return () => true;
  return (s) => BEGINNER_STEPS.includes(s.step);
}

/** Pieces and pawns on the board (both sides). */
function menOnBoard(fen: string): number {
  return (fen.split(' ')[0].match(/[prnbqk]/gi) ?? []).length;
}

/** What the coach says when no lesson can be planned. Two different truths:
 *  the habits they know are not yet showing up in their games (then a lesson
 *  is the wrong tool — drill it, so the habit shows up in play), or there
 *  is simply no fair board yet (a fresh device). */
export async function noLessonLine(): Promise<string> {
  const gap = worstGap(await loadThinkingTransfer().catch((): StepTransfer[] => []));
  if (gap) return `${transferGapLine(gap)} Another lesson won't fix that — drill it in Tactics until it shows up in your games.`;
  return 'There is no clean board for a lesson yet — play or import a few games and the lessons build from them.';
}
