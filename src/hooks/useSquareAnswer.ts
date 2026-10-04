import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import {
  applySquareHelp,
  applySquareShow,
  applySquareSilence,
  applySquareTap,
  MISSES_BEFORE_SHOW,
  newSquareAnswer,
  PARTIAL_NUDGE_MS,
  squareAnswerDetail,
  type SquareAnswerMode,
  type SquareAnswerState,
  type SquareAnswerStatus,
  type SquareSetGrade,
  type AnswerDetail, type AnswerHelp,
} from '../services/squareAnswerGrader';

/**
 * useSquareAnswer — THE ONE TAP-ANSWER HOOK (Learn how to think, P0c).
 *
 * A THIN shell: the question's state machine is pure
 * (`squareAnswerGrader.applySquareTap` & co., graded by `gradeSquareSet`);
 * this hook only holds that state, runs the ~8 s "one more" timer, paints the
 * squares and calls back. Every rule — what a wrong tap costs, when the key is
 * shown, what the record says — lives in the pure module.
 *
 * Consumers: Analysis Practice today; lesson steps, the revived Review reading
 * card and the Setup Trainer's first miss next. Find the Square is a
 * coordinate drill of a different shape and does not use it.
 */

export type { SquareAnswerStatus };

export interface SquareAnswerSettled {
  /** True when the student reached the key; false when it was shown. */
  solved: boolean;
  detail: AnswerDetail;
}

export interface UseSquareAnswerOpts {
  /** The computed key; null = this question is not answered by tapping. */
  key: readonly Square[] | null;
  mode: SquareAnswerMode;
  /** Changes when a new question is asked — the state resets. */
  questionKey: string;
  maxMisses?: number;
  nudgeAfterMs?: number;
  /** A partial answer paused: say "one more". */
  onNudge?: (grade: SquareSetGrade) => void;
  /** A tap outside the key that did not end the question, with misses so far. */
  onWrongTap?: (square: Square, misses: number) => void;
  /** A right tap that did not finish the answer. */
  onPartial?: (grade: SquareSetGrade) => void;
  /** The question settled: right, or shown. Fires exactly once. */
  onSettled?: (r: SquareAnswerSettled) => void;
  /** Map a wrong square to the misconception it names (`wrongTapTag`). */
  tagWrongTap?: (square: Square) => MisconceptionTagId | null;
}

export interface UseSquareAnswer {
  /** Grade one tap. Null when taps are not accepted (no key). */
  tap: (square: Square) => SquareSetGrade | null;
  /** Raise the help level the answer was given with (a Hint button). */
  noteHelp: (help: AnswerHelp) => void;
  /** Show the key now ("I don't know", or a Show button). */
  show: (help: Extract<AnswerHelp, 'show' | 'dont-know'>) => void;
  status: SquareAnswerStatus;
  hits: readonly Square[];
  wrongTaps: readonly Square[];
  /** Ready-made board highlights: found green, wrong red, shown key amber. */
  squareStyles: Record<string, CSSProperties>;
}

const STYLE_HIT: CSSProperties = { background: 'rgba(34,197,94,0.45)' };
const STYLE_WRONG: CSSProperties = { background: 'rgba(239,68,68,0.45)' };
const STYLE_SHOWN: CSSProperties = { background: 'rgba(245,158,11,0.45)' };

export function useSquareAnswer(opts: UseSquareAnswerOpts): UseSquareAnswer {
  const optsRef = useRef(opts);
  const keySig = (opts.key ?? []).join(',');
  optsRef.current = opts;
  // The state lives in a ref so a burst of taps in one frame grades against
  // every earlier tap; `setView` re-renders.
  const stateRef = useRef<SquareAnswerState>(newSquareAnswer(opts.key ?? [], opts.mode, Date.now()));
  const [view, setView] = useState<SquareAnswerState>(stateRef.current);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNudge = (): void => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = null;
  };

  const commit = useCallback((next: SquareAnswerState): void => {
    const was = stateRef.current.status;
    stateRef.current = next;
    setView(next);
    if (was === 'answering' && next.status !== 'answering') {
      clearNudge();
      optsRef.current.onSettled?.({ solved: next.status === 'right', detail: squareAnswerDetail(next) });
    }
  }, []);

  useEffect(() => {
    clearNudge();
    const fresh = newSquareAnswer(optsRef.current.key ?? [], optsRef.current.mode, Date.now());
    stateRef.current = fresh;
    setView(fresh);
    return clearNudge;
  }, [opts.questionKey, keySig]);

  const tap = useCallback((square: Square): SquareSetGrade | null => {
    const o = optsRef.current;
    if (!o.key) return null;
    const s = stateRef.current;
    const wrongTag = s.key.includes(square) ? null : (o.tagWrongTap?.(square) ?? null);
    const r = applySquareTap(s, square, Date.now(), { maxMisses: o.maxMisses ?? MISSES_BEFORE_SHOW, wrongTag });
    if (r.outcome === 'ignored') return r.grade;
    commit(r.state);
    if (r.outcome === 'wrong') o.onWrongTap?.(square, r.state.extras.length);
    if (r.outcome === 'found') {
      o.onPartial?.(r.grade);
      clearNudge();
      nudgeTimer.current = setTimeout(() => {
        nudgeTimer.current = null;
        const silence = applySquareSilence(stateRef.current);
        if (!silence.nudge) return;
        commit(silence.state);
        optsRef.current.onNudge?.(r.grade);
      }, o.nudgeAfterMs ?? PARTIAL_NUDGE_MS);
    }
    return r.grade;
  }, [commit]);

  const noteHelp = useCallback((help: AnswerHelp): void => {
    commit(applySquareHelp(stateRef.current, help));
  }, [commit]);

  const show = useCallback((help: Extract<AnswerHelp, 'show' | 'dont-know'>): void => {
    commit(applySquareShow(stateRef.current, help));
  }, [commit]);

  const squareStyles: Record<string, CSSProperties> = {};
  if (opts.key) {
    if (view.status === 'shown') for (const s of view.key) squareStyles[s] = STYLE_SHOWN;
    for (const t of view.taps) if (!t.right) squareStyles[t.square] = STYLE_WRONG;
    for (const s of view.hits) squareStyles[s] = STYLE_HIT;
  }

  return {
    tap,
    noteHelp,
    show,
    status: view.status,
    hits: view.hits,
    wrongTaps: view.extras,
    squareStyles,
  };
}
