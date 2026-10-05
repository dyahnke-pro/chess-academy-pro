// thinkingLesson — the PURE runner behind "Learn how to think" (plan:
// docs/plans/2026-10-04-learn-how-to-think.md).
//
// A lesson asks the student to FIND things on the board by tapping squares
// ("tap every loose piece of theirs"). This module owns the question's state
// machine and nothing else: which tap is right, when to say "good — one more",
// when to stop asking and show the answer, and what the answer record says.
// No Dexie, no engine, no clock (time comes in as a number), no React — the
// hook and the page own those. The answer KEY is computed elsewhere (the
// step's board computer); this module never decides chess (G0).
//
// Contract (David 2026-10-04):
//   - every answer is a tap; several answers mean several taps;
//   - a partial answer followed by silence gets "Good — one more";
//   - a wrong tap is answered with the METHOD step that rules it out, never the
//     answer (the step computer supplies that line);
//   - after a set number of wrong taps, or a second silence, the coach shows the
//     rest and the answer counts as helped (prompted).
// The tap-answer state and the outcome rule are the SHARED ones
// (`squareAnswerGrader`, `answerEvidenceOutcome`) — this module adds only the
// lesson's flow (second silence shows, the spoken lines).
import type { Square } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';
import {
  MISSES_BEFORE_SHOW, PARTIAL_NUDGE_MS, applySquareShow, applySquareSilence, applySquareTap,
  newSquareAnswer, squareAnswerDetail, type SquareAnswerState,
} from './squareAnswerGrader';
import { answerEvidenceOutcome, type AnswerDetail, type AnswerHelp } from './capabilityEvidence';

/** How a step is taught, from the student's own standing on it. */
export type LessonStage = 'show' | 'guide' | 'solo';

/** The heat-map state of a step, read from the record (KNOW reading). */
export type StepStanding = 'red' | 'grey' | 'green';

/** Show → Guide → Solo for a step that is not yet known; a green step gets one
 *  Solo position as a quick review (David 2026-10-04: "touch on it quickly"). */
export function stagesFor(standing: StepStanding): readonly LessonStage[] {
  return standing === 'green' ? ['solo'] : ['show', 'guide', 'solo'];
}

/** Wrong taps allowed before the coach shows the rest — the ONE number every
 *  tap question uses (`squareAnswerGrader`). */
export const MAX_WRONG_TAPS = MISSES_BEFORE_SHOW;

/** The silence (ms) after a partial answer before "good — one more". */
export const NUDGE_AFTER_MS = PARTIAL_NUDGE_MS;

/** The help a question took — the shared vocabulary (`AnswerHelp`). */
export type HelpUsed = AnswerHelp;

/** A lesson question: the ONE tap-answer state (`squareAnswerGrader`, every
 *  key square must be found) plus how many silence nudges it has had — the
 *  lesson shows the rest on the second silence. */
export interface QuestionState extends SquareAnswerState {
  readonly nudges: number;
}

export function newQuestion(key: readonly Square[], now: number): QuestionState {
  return { ...newSquareAnswer(key, 'all', now), nudges: 0 };
}

/** Whether the question is settled (answered or shown). */
export function questionDone(q: QuestionState): boolean {
  return q.status !== 'answering';
}

export type TapOutcome =
  /** A key square, more remain. `remaining` is said only after the first try. */
  | { kind: 'found'; square: Square; remaining: number }
  /** The last key square — the question is answered. */
  | { kind: 'complete'; square: Square }
  /** Already found, or tapped after the question closed — nothing happens. */
  | { kind: 'ignored'; square: Square }
  /** Not in the key. The caller speaks the step's method line for this square. */
  | { kind: 'wrong'; square: Square; wrongCount: number }
  /** Too many wrong taps — show the rest. */
  | { kind: 'reveal'; square: Square; missing: readonly Square[] };

const remainingOf = (s: QuestionState): Square[] => s.key.filter((k) => !s.hits.includes(k));

/** Apply one tap through the shared grader. Pure. */
export function applyTap(
  state: QuestionState,
  square: Square,
  now: number,
): { state: QuestionState; outcome: TapOutcome } {
  const r = applySquareTap(state, square, now, { maxMisses: MAX_WRONG_TAPS });
  const next: QuestionState = { ...r.state, nudges: state.nudges };
  switch (r.outcome) {
    case 'ignored': return { state, outcome: { kind: 'ignored', square } };
    case 'found': return { state: next, outcome: { kind: 'found', square, remaining: next.key.length - next.hits.length } };
    case 'complete': return { state: next, outcome: { kind: 'complete', square } };
    case 'wrong': return { state: next, outcome: { kind: 'wrong', square, wrongCount: next.extras.length } };
    case 'reveal': return { state: next, outcome: { kind: 'reveal', square, missing: remainingOf(next) } };
  }
}

export type SilenceOutcome =
  | { kind: 'none' }
  /** First silence after a partial answer: "Good — one more." */
  | { kind: 'nudge'; remaining: number }
  /** Second silence: show the rest. */
  | { kind: 'reveal'; missing: readonly Square[] };

/** The nudge timer fired. Only a PARTIAL answer is nudged — silence before any
 *  right tap is the student still looking, and the coach waits. A nudge is not
 *  help (it says how many, never where); the second silence shows the rest. */
export function applySilence(state: QuestionState): { state: QuestionState; outcome: SilenceOutcome } {
  if (questionDone(state) || state.hits.length === 0) return { state, outcome: { kind: 'none' } };
  const missing = remainingOf(state);
  if (state.nudges === 0) {
    const { state: nudged } = applySquareSilence(state);
    return { state: { ...nudged, nudges: 1 }, outcome: { kind: 'nudge', remaining: missing.length } };
  }
  return { state: { ...applySquareShow(state, 'show'), nudges: state.nudges }, outcome: { kind: 'reveal', missing } };
}

/** The student said "I don't know" (button or phrase): honest data, counted as
 *  helped, and the coach shows the step. */
export function applyDontKnow(state: QuestionState): { state: QuestionState; missing: readonly Square[] } {
  return { state: { ...applySquareShow(state, 'dont-know'), nudges: state.nudges }, missing: remainingOf(state) };
}

/** The answer record for one question: the shared `AnswerDetail` (what
 *  `recordAnswer` writes) plus the lesson's own reading of it. `held` and
 *  `prompted` come from the ONE outcome rule (`answerEvidenceOutcome`). */
export interface AnswerSummary {
  detail: AnswerDetail;
  solved: boolean;
  held: boolean;
  prompted: boolean;
  help: HelpUsed;
  taps: Square[];
  extras: Square[];
  msToFirst: number | null;
  keySize: number;
  foundCount: number;
}

export function summariseAnswer(state: QuestionState): AnswerSummary {
  const detail = squareAnswerDetail(state);
  const solved = state.status === 'right';
  const { outcome, prompted } = answerEvidenceOutcome({ solved, answer: detail });
  return {
    detail,
    solved,
    held: outcome === 'held' && !prompted,
    prompted,
    help: state.help,
    taps: state.taps.map((t) => t.square),
    extras: [...state.extras],
    msToFirst: detail.msToFirst,
    keySize: state.key.length,
    foundCount: state.hits.length,
  };
}

// ─── Spoken lines (code-authored, rotated on a stable key — never random) ────

const ONE_MORE = ['Good — one more.', 'Good. There’s one more.', 'Right — keep looking, one more.'];
const N_MORE = (n: number): string[] => [`Good — ${n} more.`, `Right. ${n} more to find.`, `Good. Keep going — ${n} more.`];
const FOUND_ONE = ['Yes.', 'That’s one.', 'Right.'];
const COMPLETE = ['That’s all of them.', 'Got them all.', 'Every one — clean.'];

/** What the coach says after a right tap that leaves more to find. The count is
 *  said only after the first try (guess-proofing: the student must look before
 *  they know how many). */
export function foundLine(remaining: number, tapIndex: number): string {
  if (tapIndex === 0) return rotateStem(FOUND_ONE, remaining);
  return remaining === 1 ? rotateStem(ONE_MORE, tapIndex) : rotateStem(N_MORE(remaining), tapIndex);
}

/** The silence nudge. */
export function nudgeLine(remaining: number, key: number): string {
  return remaining === 1 ? rotateStem(ONE_MORE, key) : rotateStem(N_MORE(remaining), key);
}

/** Earned praise on a clean, unhelped answer only (David: "We need some
 *  praise"); a helped answer closes without it. */
export function completeLine(summary: AnswerSummary, key: number): string | null {
  return summary.held ? rotateStem(COMPLETE, key) : null;
}
