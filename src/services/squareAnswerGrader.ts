/**
 * squareAnswerGrader — THE ONE DETERMINISTIC GRADER FOR A TAPPED ANSWER
 * (Learn how to think, P0c, 2026-10-04: "Every answer is a tap on the board.
 * Several answers mean several taps.").
 *
 * A tap answer is a SET of squares graded against a SET of squares the board
 * computed (`ReadingQuestion.answerSquares`, a lesson's fair key). Nothing here
 * reads prose and nothing asks a model: the verdict is set arithmetic, so it is
 * the same on every surface that asks the student to point at the board —
 * Analysis Practice, the Review reading card, lessons, the Setup Trainer.
 *
 * It replaces, for TAP answers, the path that turned a clicked square into a
 * text string and handed it to `gradeReadingAnswer` (an LLM verdict — G0: the
 * model decided whether the student was right). Typed answers still take that
 * text path today; this module never sees words.
 *
 * Two modes:
 *  • `any` — the question has several right answers and naming ONE is a full
 *    read ("name a forcing candidate"). Today's meaning of `answerSquares`.
 *  • `all` — find them all ("tap every hanging piece"). One found is `partial`.
 *
 * GUESS-PROOFING: an extra tap (a square outside the key) makes the answer
 * `wrong`, whatever else was found. Tapping the whole board is not a read.
 */
import type { Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnswerDetail, AnswerHelp } from './capabilityEvidence';

export type SquareAnswerMode = 'any' | 'all';

export type SquareAnswerVerdict = 'right' | 'partial' | 'wrong';

export interface SquareSetGrade {
  /** Key squares the student tapped, in tap order. */
  hits: Square[];
  /** Key squares not tapped yet, in key order. */
  misses: Square[];
  /** Tapped squares outside the key, in tap order. Any extra → `wrong`. */
  extras: Square[];
  verdict: SquareAnswerVerdict;
}

/** How many wrong taps before the answer is SHOWN — the one number every
 *  tap surface uses (Analysis Practice's three tries, a lesson's Show). */
export const MISSES_BEFORE_SHOW = 3;

/** How long a partial `all` answer may sit before the coach says "one more". */
export const PARTIAL_NUDGE_MS = 8000;

/**
 * Grade a set of taps against the key. Pure; duplicate taps count once.
 *
 *  any: right ⇔ at least one hit and no extra.
 *  all: right ⇔ every key square hit and no extra; some hits and no extra →
 *       partial.
 *  Any extra → wrong. No taps at all → partial (nothing answered yet, nothing
 *  wrong either). An EMPTY key (the answer is "nothing") can never be tapped
 *  right: every tap is an extra.
 */
export function gradeSquareSet(args: { key: readonly Square[]; taps: readonly Square[]; mode: SquareAnswerMode }): SquareSetGrade {
  const key = [...new Set(args.key)];
  const keySet = new Set<Square>(key);
  const taps = [...new Set(args.taps)];
  const hits = taps.filter((t) => keySet.has(t));
  const extras = taps.filter((t) => !keySet.has(t));
  const hitSet = new Set(hits);
  const misses = key.filter((k) => !hitSet.has(k));
  let verdict: SquareAnswerVerdict;
  if (extras.length > 0) verdict = 'wrong';
  else if (hits.length === 0) verdict = 'partial';
  else if (args.mode === 'any') verdict = 'right';
  else verdict = misses.length === 0 ? 'right' : 'partial';
  return { hits, misses, extras, verdict };
}

// ── THE QUESTION'S STATE MACHINE (pure) ─────────────────────────────────────
// The tap-answer hook is a thin shell over these: it holds the state, owns the
// nudge timer and paints squares. Pure (no React, no clock — time comes in as
// a number) so the lesson runner's machine (thinkingLesson.ts, all-mode) and
// this one can converge on ONE copy at merge.

const HELP_RANK: Record<AnswerHelp, number> = { none: 0, nudge: 1, hint: 2, show: 3, 'dont-know': 4 };

export type SquareAnswerStatus = 'answering' | 'right' | 'shown';

export interface SquareAnswerState {
  readonly key: readonly Square[];
  readonly mode: SquareAnswerMode;
  readonly hits: readonly Square[];
  readonly taps: ReadonlyArray<{ square: Square; right: boolean }>;
  readonly extras: readonly Square[];
  readonly stamps: readonly number[];
  readonly startedAt: number;
  readonly help: AnswerHelp;
  readonly firstMissHelp?: AnswerHelp;
  readonly wrongTags: readonly MisconceptionTagId[];
  readonly status: SquareAnswerStatus;
}

export function newSquareAnswer(key: readonly Square[], mode: SquareAnswerMode, now: number): SquareAnswerState {
  return { key: [...new Set(key)], mode, hits: [], taps: [], extras: [], stamps: [], startedAt: now, help: 'none', wrongTags: [], status: 'answering' };
}

/** Raise the help level (never lowers it). */
export function applySquareHelp(s: SquareAnswerState, help: AnswerHelp): SquareAnswerState {
  return HELP_RANK[help] > HELP_RANK[s.help] ? { ...s, help } : s;
}

export type SquareTapOutcome = 'ignored' | 'found' | 'complete' | 'wrong' | 'reveal';

/** One tap, graded by `gradeSquareSet`. `wrongTag` is what the wrong-tap
 *  computer named for this square (null when unsure). */
export function applySquareTap(
  s: SquareAnswerState,
  square: Square,
  now: number,
  opts: { maxMisses?: number; wrongTag?: MisconceptionTagId | null } = {},
): { state: SquareAnswerState; outcome: SquareTapOutcome; grade: SquareSetGrade } {
  if (s.status !== 'answering' || s.hits.includes(square)) {
    return { state: s, outcome: 'ignored', grade: gradeSquareSet({ key: s.key, taps: s.hits, mode: s.mode }) };
  }
  const grade = gradeSquareSet({ key: s.key, taps: [...s.hits, square], mode: s.mode });
  const stamps = [...s.stamps, now];
  if (grade.extras.length > 0) {
    const extras = [...s.extras, square];
    const tag = opts.wrongTag ?? null;
    const next: SquareAnswerState = {
      ...s, stamps, extras,
      taps: [...s.taps, { square, right: false }],
      firstMissHelp: s.firstMissHelp ?? s.help,
      wrongTags: tag && !s.wrongTags.includes(tag) ? [...s.wrongTags, tag] : s.wrongTags,
    };
    if (extras.length >= (opts.maxMisses ?? MISSES_BEFORE_SHOW)) {
      return { state: { ...applySquareHelp(next, 'show'), status: 'shown' }, outcome: 'reveal', grade };
    }
    return { state: next, outcome: 'wrong', grade };
  }
  const next: SquareAnswerState = { ...s, stamps, hits: [...s.hits, square], taps: [...s.taps, { square, right: true }] };
  if (grade.verdict === 'right') return { state: { ...next, status: 'right' }, outcome: 'complete', grade };
  return { state: next, outcome: 'found', grade };
}

/** The nudge timer fired after a partial answer: "Good — one more." Only a
 *  partial answer is nudged; silence before any right tap is still looking. */
export function applySquareSilence(s: SquareAnswerState): { state: SquareAnswerState; nudge: boolean } {
  if (s.status !== 'answering' || s.hits.length === 0) return { state: s, nudge: false };
  return { state: applySquareHelp(s, 'nudge'), nudge: true };
}

/** Show the key now (a Show button, or "I don't know"). */
export function applySquareShow(s: SquareAnswerState, help: Extract<AnswerHelp, 'show' | 'dont-know'>): SquareAnswerState {
  if (s.status !== 'answering') return s;
  return { ...applySquareHelp(s, help), status: 'shown' };
}

/** The settled answer's record, ready for `recordAnswer`. */
export function squareAnswerDetail(s: SquareAnswerState): AnswerDetail {
  return {
    taps: s.taps.map((t) => ({ square: t.square, right: t.right })),
    extras: [...s.extras],
    wrongAttempts: s.extras.length,
    ...(s.firstMissHelp !== undefined ? { firstMissHelp: s.firstMissHelp } : {}),
    msToFirst: s.stamps.length > 0 ? s.stamps[0] - s.startedAt : null,
    msBetween: s.stamps.slice(1).map((t, i) => t - s.stamps[i]),
    help: s.help,
    spoken: false,
    chainDepth: 0,
    wrongTags: [...s.wrongTags],
    keySize: s.key.length,
  };
}
