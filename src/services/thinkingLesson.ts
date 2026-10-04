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
import type { Square } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';

/** How a step is taught, from the student's own standing on it. */
export type LessonStage = 'show' | 'guide' | 'solo';

/** The heat-map state of a step, read from the record (KNOW reading). */
export type StepStanding = 'red' | 'grey' | 'green';

/** Show → Guide → Solo for a step that is not yet known; a green step gets one
 *  Solo position as a quick review (David 2026-10-04: "touch on it quickly"). */
export function stagesFor(standing: StepStanding): readonly LessonStage[] {
  return standing === 'green' ? ['solo'] : ['show', 'guide', 'solo'];
}

/** Wrong taps allowed before the coach shows the rest. */
export const MAX_WRONG_TAPS = 3;

/** The silence (ms) after a partial answer before "good — one more". */
export const NUDGE_AFTER_MS = 8000;

export type HelpUsed = 'none' | 'nudge' | 'show' | 'dont-know';

export interface QuestionState {
  /** The computed answer set (every square must be found). */
  readonly key: readonly Square[];
  /** Key squares found, in tap order. */
  readonly found: readonly Square[];
  /** Every tap, in order (right and wrong). */
  readonly taps: readonly Square[];
  /** Wrong taps, in order. */
  readonly wrong: readonly Square[];
  readonly nudges: number;
  readonly help: HelpUsed;
  readonly startedAt: number;
  readonly tapTimes: readonly number[];
  readonly done: boolean;
}

export function newQuestion(key: readonly Square[], now: number): QuestionState {
  return {
    key: [...new Set(key)],
    found: [],
    taps: [],
    wrong: [],
    nudges: 0,
    help: 'none',
    startedAt: now,
    tapTimes: [],
    done: false,
  };
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

const remainingOf = (s: QuestionState): Square[] => s.key.filter((k) => !s.found.includes(k));

/** Apply one tap. Pure: returns the next state and what happened. */
export function applyTap(
  state: QuestionState,
  square: Square,
  now: number,
): { state: QuestionState; outcome: TapOutcome } {
  if (state.done || state.found.includes(square)) {
    return { state, outcome: { kind: 'ignored', square } };
  }
  const taps = [...state.taps, square];
  const tapTimes = [...state.tapTimes, now];
  if (state.key.includes(square)) {
    const found = [...state.found, square];
    const next: QuestionState = { ...state, taps, tapTimes, found };
    const remaining = state.key.length - found.length;
    if (remaining === 0) return { state: { ...next, done: true }, outcome: { kind: 'complete', square } };
    return { state: next, outcome: { kind: 'found', square, remaining } };
  }
  const wrong = [...state.wrong, square];
  const next: QuestionState = { ...state, taps, tapTimes, wrong };
  if (wrong.length >= MAX_WRONG_TAPS) {
    return {
      state: { ...next, done: true, help: 'show' },
      outcome: { kind: 'reveal', square, missing: remainingOf(next) },
    };
  }
  return { state: next, outcome: { kind: 'wrong', square, wrongCount: wrong.length } };
}

export type SilenceOutcome =
  | { kind: 'none' }
  /** First silence after a partial answer: "Good — one more." */
  | { kind: 'nudge'; remaining: number }
  /** Second silence: show the rest. */
  | { kind: 'reveal'; missing: readonly Square[] };

/** The nudge timer fired. Only a PARTIAL answer is nudged — silence before any
 *  right tap is the student still looking, and the coach waits. */
export function applySilence(state: QuestionState): { state: QuestionState; outcome: SilenceOutcome } {
  if (state.done || state.found.length === 0) return { state, outcome: { kind: 'none' } };
  const missing = remainingOf(state);
  if (state.nudges === 0) {
    return {
      state: { ...state, nudges: 1, help: state.help === 'none' ? 'nudge' : state.help },
      outcome: { kind: 'nudge', remaining: missing.length },
    };
  }
  return { state: { ...state, done: true, help: 'show' }, outcome: { kind: 'reveal', missing } };
}

/** The student said "I don't know" (button or phrase): honest data, counted as
 *  helped, and the coach shows the step. */
export function applyDontKnow(state: QuestionState): { state: QuestionState; missing: readonly Square[] } {
  return { state: { ...state, done: true, help: 'dont-know' }, missing: remainingOf(state) };
}

/** The answer record: one row per question, the shape the evidence writer
 *  takes. `held` only when every key square was found with no help; `prompted`
 *  whenever the coach helped (a nudge, a reveal, "I don't know"). */
export interface AnswerSummary {
  held: boolean;
  prompted: boolean;
  help: HelpUsed;
  taps: Square[];
  extras: Square[];
  msToFirst: number | null;
  msBetween: number[];
  keySize: number;
  foundCount: number;
}

export function summariseAnswer(state: QuestionState): AnswerSummary {
  const complete = state.found.length === state.key.length;
  const msToFirst = state.tapTimes.length > 0 ? state.tapTimes[0] - state.startedAt : null;
  const msBetween = state.tapTimes.slice(1).map((t, i) => t - state.tapTimes[i]);
  return {
    held: complete && state.help === 'none' && state.wrong.length === 0,
    prompted: state.help !== 'none',
    help: state.help,
    taps: [...state.taps],
    extras: [...state.wrong],
    msToFirst,
    msBetween,
    keySize: state.key.length,
    foundCount: state.found.length,
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
