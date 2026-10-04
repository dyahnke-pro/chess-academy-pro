// useThinkingLesson — the React side of "Learn how to think": owns one
// ThinkingLessonSession, exposes its view, and forwards taps. All lesson logic
// lives in the session (services/thinkingLessonSession.ts); this hook only
// wires real voice, timers, the evidence writer and the position source.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import {
  ThinkingLessonSession, type AnsweredQuestion, type LessonView, type StepKit,
} from '../services/thinkingLessonSession';
import type { StepStanding } from '../services/thinkingLesson';
import { loadLessonCandidates, type LessonUsernames } from '../services/thinkingLessonSource';
import { getThinkingLessonMemory, rememberLessonBoard, seenFor } from '../services/thinkingLessonMemory';
import type { LessonPositionCandidate } from '../services/thinkingPositions';

export interface UseThinkingLessonDeps {
  say: (text: string) => Promise<void>;
  record: (answer: AnsweredQuestion) => Promise<void>;
  standing: (step: string) => Promise<StepStanding>;
}

export interface UseThinkingLesson {
  view: LessonView;
  start: (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }) => Promise<void>;
  tap: (square: Square) => void;
  dontKnow: () => void;
  /** Hold the nudge while the student asks something else. */
  hold: () => void;
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
    const [candidates, memory, standing] = await Promise.all([
      opts.candidates ? Promise.resolve(opts.candidates) : loadLessonCandidates(opts),
      getThinkingLessonMemory(),
      depsRef.current.standing(kit.step).catch((): StepStanding => 'grey'),
    ]);
    const session = new ThinkingLessonSession(kit, candidates, seenFor(memory, kit.step), {
      say: (t) => depsRef.current.say(t),
      record: (a) => depsRef.current.record(a),
      remember: (step, fen) => rememberLessonBoard(step, fen, new Date().toISOString()),
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

  return { view, start, tap, dontKnow, hold, stop };
}
