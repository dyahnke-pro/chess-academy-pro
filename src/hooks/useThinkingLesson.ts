// useThinkingLesson — the React side of "Learn how to think": owns one
// ThinkingLessonSession, exposes its view, and forwards taps. All lesson logic
// lives in the session (services/thinkingLessonSession.ts); this hook only
// wires real voice and timers; the plan, the boards and the record come
// through the one door (services/thinkingLessonStart.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import {
  ThinkingLessonSession, type LessonView, finishThinkingLesson, lessonInputs, planThinkingLesson, recordLessonAnswer, rememberLessonBoardNow,
  type LessonPositionCandidate, type LessonUsernames, type PlannedLesson, type StepKit,
} from '../services/thinkingLessonStart';

export type { StepKit, PlannedLesson, LessonView };

export interface UseThinkingLessonDeps {
  say: (text: string) => Promise<void>;
}

export interface UseThinkingLesson {
  view: LessonView;
  /** Choose this student's step (null = no fair board yet). */
  plan: (opts: { usernames: LessonUsernames; rating: number }) => Promise<PlannedLesson | null>;
  start: (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }) => Promise<void>;
  /** A planned lesson ended: closes Up next's bite; returns the tier-unlock line, if one opened. */
  finish: (plan: PlannedLesson, source: string) => Promise<string | null>;
  tap: (square: Square) => void;
  dontKnow: () => void;
  /** Hold the nudge while the student asks something else. */
  hold: () => void;
  /** The lesson game: ask the step's question once, on this live board. */
  askOnce: (kit: StepKit, fen: string) => Promise<void>;
  stop: () => void;
}

const IDLE: LessonView = {
  active: false, step: null, stage: null, fen: null, found: [], wrong: [], shown: [], asking: false, prompt: null, index: 0, total: 0,
};

export function useThinkingLesson(deps: UseThinkingLessonDeps): UseThinkingLesson {
  const [view, setView] = useState<LessonView>(IDLE);
  const sessionRef = useRef<ThinkingLessonSession | null>(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const stop = useCallback((): void => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setView(IDLE);
  }, []);

  useEffect(() => () => { sessionRef.current?.stop(); }, []);

  const start = useCallback(async (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }): Promise<void> => {
    sessionRef.current?.stop();
    const { candidates, seen, standing } = await lessonInputs(kit, opts);
    const session = new ThinkingLessonSession(kit, candidates, seen, {
      say: (t) => depsRef.current.say(t),
      record: recordLessonAnswer,
      remember: rememberLessonBoardNow,
      now: () => Date.now(),
      setTimer: (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); },
      onView: (v) => { if (sessionRef.current === session) setView(v); },
    });
    sessionRef.current = session;
    await session.run(standing);
    if (sessionRef.current === session) sessionRef.current = null;
  }, []);

  const tap = useCallback((square: Square): void => { void sessionRef.current?.tap(square); }, []);
  const dontKnow = useCallback((): void => { void sessionRef.current?.dontKnow(); }, []);
  const hold = useCallback((): void => { sessionRef.current?.hold(); }, []);

  const askOnce = useCallback(async (kit: StepKit, fen: string): Promise<void> => {
    sessionRef.current?.stop();
    const session = new ThinkingLessonSession(kit, [{ fen, origin: 'game' }], new Set(), {
      say: (t) => depsRef.current.say(t),
      record: recordLessonAnswer,
      remember: async () => { /* a live game board is not a lesson board */ },
      now: () => Date.now(),
      setTimer: (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); },
      onView: (v) => { if (sessionRef.current === session) setView(v); },
    });
    sessionRef.current = session;
    await session.run('grey', { once: true });
    if (sessionRef.current === session) sessionRef.current = null;
  }, []);

  return { view, plan: planThinkingLesson, start, finish: finishThinkingLesson, tap, dontKnow, hold, askOnce, stop };
}
