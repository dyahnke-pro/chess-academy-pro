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
import type { AnsweredQuestion, LessonProgress, StepKit } from './thinkingLessonSession';
import { getCapabilityProfile, type CapabilityProfile } from './capabilityEvidence';
import { chooseThinkingStep, gameWeightForTags, lessonCloseLine, openTier, tierUnlockLine, type BuiltStep, type StepChoice } from './thinkingLessonPlan';
import { heatMap, type HeatTile } from './heatMap';
import { getUnifiedWeaknessProfile, type UnifiedWeakness } from './weaknessSpine';
import { recordThinkingAnswer, standingFromProfile } from './thinkingLessonRecord';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { BUILT_THINKING_STEPS, tagsForThinkingStep } from './thinkingSteps.built';
import { TAG_STEP } from './thinkingSteps';
import { getMisconceptionsForGame } from './misconceptionService';
import type { MisconceptionTagRecord } from '../types';
import { loadLessonCandidates, type LessonUsernames } from './thinkingLessonSource';
import { getThinkingLessonMemory, rememberLessonBoard, resumeFor, saveLessonResume, seenFor, type LessonResume } from './thinkingLessonMemory';
import { MIXED_INTRO, MIXED_STEP, choiceAnswerDetail, mixedBoards, type StepChoiceAnswer } from './thinkingMixedRound';
import { recordAnswer } from './answerRecord';
import { boardIdentity, isFairKey, pickFairPosition, type LessonPositionCandidate } from './thinkingPositions';
import { finishBite } from './activeBite';
import { reward } from './rewardService';
import { logAppAudit } from './appAuditor';
import { db } from '../db/schema';
import { isFixtureDerived, isFixtureGame } from './fixtureGames';
import {
  thinkingTransfer, transferCounts, transferGapLine, worstGap,
  type StepTransfer, type TransferGame, type TransferSlip,
} from './thinkingTransfer';
import { emitThinkingTransfer } from './thinkingTransferEvents';

export type { StepKit, AnsweredQuestion, LessonStage, LessonUsernames, LessonPositionCandidate, LessonProgress, StepChoiceAnswer, LessonResume };
export type { LessonView } from './thinkingLessonSession';
// The session itself: a surface opens it through this door, never directly.
export { ThinkingLessonSession, IDLE_LESSON_VIEW } from './thinkingLessonSession';
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

async function knowProfile(): Promise<CapabilityProfile> {
  try { return await getCapabilityProfile('know'); } catch { return new Map(); }
}

/** Which step to teach this student now, and the boards to teach it on. Null
 *  when no step has a fair board for them yet (a fresh device with no games
 *  and no puzzles near their rating). */
export async function planThinkingLesson(opts: { usernames: LessonUsernames; rating: number; beginner?: boolean }): Promise<PlannedLesson | null> {
  const [profile, useProfile, weaknesses, loaded, memory, transfer] = await Promise.all([
    knowProfile(),
    getCapabilityProfile('use').catch((): CapabilityProfile => new Map()),
    getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
    loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
    loadThinkingTransfer(),
  ]);
  const pending = habitPendingFrom(transfer);
  // What the student's GAMES say (the heat map Up next reads): which steps
  // they keep failing, and the boards they failed them on.
  const tiles: HeatTile[] = heatMap(useProfile, weaknesses);
  const candidates = withWeaknessBoards(loaded, weaknesses);
  // Only steps this student has a FAIR board for can be served (a step that
  // needs their own games has none on a fresh device).
  const availability = new Map<BuiltStep, boolean>();
  const beginnerOk = beginnerAllows(!!opts.beginner, (s) => standingFromProfile(profile, s.tags));
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
  const standingOf = (s: BuiltStep): StepStanding => standingFromProfile(profile, s.tags);
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
      const pool = boardsForStep(candidates, weaknesses, choice.mix.flatMap((s) => s.tags), !!opts.beginner);
      if (mixedBoards(kits, pool, seenFor(memory, MIXED_STEP)).length >= 2) {
        return { kit: mixedRoundKit(), reason: 'mixed', openTier: choice.openTier, candidates: pool, mix: kits, ...common };
      }
    }
    const reason: StepChoice['reason'] = choice.reason === 'mixed' ? 'review' : choice.reason;
    const kit = choice.step.kit();
    // The student's own failures at THIS step first (the board they hung the
    // knight on teaches "am I safe?" better than any puzzle).
    const ordered = boardsForStep(candidates, weaknesses, choice.step.tags, !!opts.beginner);
    if (!kit.enrich) return { kit, reason, openTier: choice.openTier, candidates: ordered, ...common };
    const enriched = await enrichForLesson(kit, ordered, seenFor(memory, kit.step));
    if (enriched.length > 0) {
      return { kit, reason, openTier: choice.openTier, candidates: enriched, ...common };
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
  quiet = false,
): LessonPositionCandidate[] {
  // A beginner sees QUIET boards first (fewest pieces): difficulty only, never
  // how much the coach says. Their own failures still lead.
  const byQuiet = (list: LessonPositionCandidate[]): LessonPositionCandidate[] =>
    (quiet ? [...list].sort((a, b) => menOnBoard(a.fen) - menOnBoard(b.fen)) : list);
  const rank = new Map<string, number>();
  let n = 0;
  for (const w of weaknesses) {
    if (!w.capabilityTag || !tags.includes(w.capabilityTag)) continue;
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

/** The pool read again when a lesson runs dry mid-way: by then the boot
 *  puzzle seed has had time, and the refill waits for it longer. */
export async function refillLessonCandidates(opts: { usernames: LessonUsernames; rating: number }): Promise<LessonPositionCandidate[]> {
  const startedAt = Date.now();
  const out = await loadLessonCandidates({ ...opts, seedWaitMs: 45_000 }).catch((): LessonPositionCandidate[] => []);
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
  const [cands, memory, standing] = await Promise.all([
    opts.candidates ? Promise.resolve(opts.candidates) : loadLessonCandidates(opts).catch((): LessonPositionCandidate[] => []),
    getThinkingLessonMemory(),
    lessonStepStanding(kit.step).catch((): StepStanding => 'grey'),
  ]);
  return { candidates: cands, seen: seenFor(memory, kit.step), standing, resume: resumeFor(memory, kit.step) };
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
export async function lessonStepStanding(step: string): Promise<StepStanding> {
  return standingFromProfile(await knowProfile(), tagsForThinkingStep(step));
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
    const after = await knowProfile();
    const standingAfter = (s: BuiltStep): StepStanding => standingFromProfile(after, s.tags);
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
  const [profile, read] = await Promise.all([knowProfile(), transfer ? Promise.resolve(transfer) : loadThinkingTransfer()]);
  const standingOf = (s: BuiltStep): StepStanding => standingFromProfile(profile, s.tags);
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
export const TRANSFER_REPEAT_WINDOW_MS = 5000;
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
    const out = thinkingTransfer({ evidence, games: played, slips });
    reportTransfer(out, played.length);
    return out;
  } catch {
    return [];   // no store yet: nothing is known, nothing transferred
  }
}

/** A game's date as ms: PGN "2024.05.01" or an ISO string. Null when it is not
 *  a date — such a game is left out rather than placed on the wrong side. */
export function gamePlayedAt(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = Date.parse(date.trim().replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3'));
  return Number.isFinite(t) ? t : null;
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

/** The first of these steps that poses a fair question on this board (routine
 *  order as given), or null. For a surface asking ONE question on its own
 *  board: the Setup Trainer's first miss asks "am I safe?" when something of
 *  yours hangs there, else "their targets". */
export function firstFairKit(steps: readonly string[], fen: string): StepKit | null {
  for (const step of steps) {
    const kit = kitForStep(step);
    if (kit && !kit.enrich && isFairKey(kit.keyFor(fen))) return kit;
  }
  return null;
}

/** The steps a beginner starts on (plan "Beginner mode": steps 2–3). */
export const BEGINNER_STEPS: readonly string[] = ['their-move-changed', 'am-i-safe'];

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

// ── CARRY-OVER: the lesson's question at a real moment in Learn free play ────
//
// Plan "Learn free play" + "Lessons measure KNOW, games measure USE": when the
// student's own game reaches a board where a step they keep failing IN GAMES
// poses its question, the coach asks that step's tap question there, once.
// Learn only (Play volunteers nothing). The steps are the ones whose tags are
// red in the student's games, worst first (the same weight the lesson chooser
// uses); a step is asked at most once per game ("don't over use it").

/** The steps this student keeps failing in games, worst first. PURE. */
export function carryOverSteps(tiles: readonly HeatTile[]): string[] {
  return BUILT_THINKING_STEPS
    .map((s) => ({ step: s.step, w: gameWeightForTags(tiles, s.tags), order: s.order }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w || a.order - b.order)
    .map((x) => x.step);
}

/** The first working step that poses a fair question on this board and has
 *  not been asked this game, or null. Steps that replay a move or need the
 *  engine are never asked live. PURE. */
export function carryOverKitFor(steps: readonly string[], fen: string, asked: ReadonlySet<string>): StepKit | null {
  for (const step of steps) {
    if (asked.has(step)) continue;
    const kit = kitForStep(step);
    if (!kit || kit.adapt || kit.enrich) continue;
    if (isFairKey(kit.keyFor(fen))) return kit;
  }
  return null;
}

/** Read the student's game record once per game: the steps to carry over. */
export async function loadCarryOverSteps(): Promise<string[]> {
  try {
    const [useProfile, weaknesses] = await Promise.all([
      getCapabilityProfile('use').catch((): CapabilityProfile => new Map()),
      getUnifiedWeaknessProfile().catch((): UnifiedWeakness[] => []),
    ]);
    return carryOverSteps(heatMap(useProfile, weaknesses));
  } catch {
    return [];
  }
}

/** What the coach says when no lesson can be planned. Two different truths:
 *  the habits they know are not yet showing up in their games (then a lesson
 *  is the wrong tool — play, and the coach asks at the real moment), or there
 *  is simply no fair board yet (a fresh device). */
export async function noLessonLine(): Promise<string> {
  const gap = worstGap(await loadThinkingTransfer().catch((): StepTransfer[] => []));
  if (gap) return `${transferGapLine(gap)} Another lesson won't fix that — play a game, and the question comes at the moment it matters.`;
  return 'There is no clean board for a lesson yet — play or import a few games and the lessons build from them.';
}
