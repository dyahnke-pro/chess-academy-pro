// useThinkingLesson — the React side of "Learn how to think": owns one
// ThinkingLessonSession, exposes its view, and forwards taps. All lesson logic
// lives in the session (services/thinkingLessonSession.ts); this hook only
// wires real voice and timers; the plan, the boards and the record come
// through the one door (services/thinkingLessonStart.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import {
  ThinkingLessonSession, type LessonView, finishThinkingLesson, kitForStep, lessonInputs, planThinkingLesson, recordLessonAnswer, rememberLessonBoardNow, slipStepsForGame, firstFairKit, motifKit, type MotifBoard, carryOverKitFor, loadCarryOverSteps,
  type LessonPositionCandidate, type LessonUsernames, type PlannedLesson, type StepKit,
} from '../services/thinkingLessonStart';

export type { StepKit, PlannedLesson, LessonView };

export interface UseThinkingLessonDeps {
  say: (text: string) => Promise<void>;
}

export interface UseThinkingLesson {
  view: LessonView;
  /** Choose this student's step (null = no fair board yet). */
  plan: (opts: { usernames: LessonUsernames; rating: number; beginner?: boolean }) => Promise<PlannedLesson | null>;
  start: (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[] }) => Promise<void>;
  /** A planned lesson ended: closes Up next's bite; returns the tier-unlock line, if one opened. */
  finish: (plan: PlannedLesson, source: string) => Promise<string | null>;
  tap: (square: Square) => void;
  dontKnow: () => void;
  /** Hold the nudge while the student asks something else. */
  hold: () => void;
  /** A step's kit, to ask its question once on another surface's board. */
  kitFor: (step: string) => StepKit | null;
  /** The first of these steps with a fair question on this board. */
  firstFairKit: (steps: readonly string[], fen: string) => StepKit | null;
  /** Step 5 asked about one pattern on its own board (Pattern Recognition). */
  motifKit: (board: MotifBoard) => StepKit;
  /** The lesson game: ask the step's question once, on this live board. */
  askOnce: (kit: StepKit, fen: string) => Promise<void>;
  /** Review: the step to ask at each slip of a game, from its recorded tags. */
  slipSteps: (gameId: string, boards: readonly { ply: number; fen: string }[]) => Promise<Map<number, string>>;
  /** Learn free play: ask a step the student keeps failing in games when the
   *  board poses it — one question per game. Resolves true when it asked. */
  carryOver: (fen: string) => Promise<boolean>;
  /** A new game: the carry-over re-reads the record and may ask each step again. */
  newGame: () => void;
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

  // Unmount: stop the session AND drop it, so a view update still in flight
  // (a spoken line resolving, a nudge timer) finds no session and never sets
  // state on a component that is gone.
  useEffect(() => () => { sessionRef.current?.stop(); sessionRef.current = null; }, []);

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

  // CARRY-OVER memory, per game: the steps read once from the game record,
  // and the steps already asked.
  const carryStepsRef = useRef<Promise<string[]> | null>(null);
  const carryAskedRef = useRef<Set<string>>(new Set());
  const newGame = useCallback((): void => { carryStepsRef.current = null; carryAskedRef.current = new Set(); }, []);
  const carryPlyRef = useRef(0);
  const carryOver = useCallback(async (fen: string): Promise<boolean> => {
    // A board earlier than the last one seen is a new game: forget what was asked.
    const parts = fen.split(' ');
    const ply = (Number(parts[5]) || 1) * 2 + (parts[1] === 'b' ? 1 : 0);
    if (ply < carryPlyRef.current) newGame();
    carryPlyRef.current = ply;
    if (sessionRef.current) return false;   // a question is already open
    // ONE carry-over question per game. Learn's mid-game cards were removed
    // for interrupting too often (David 2026-08-05: "annoying AF"); this is an
    // interruption budget, not a cap on teaching — the same habit is taught
    // in full in the lesson, and the commentary keeps talking.
    if (carryAskedRef.current.size > 0) return false;
    carryStepsRef.current ??= loadCarryOverSteps();
    const kit = carryOverKitFor(await carryStepsRef.current, fen, carryAskedRef.current);
    if (!kit) return false;
    carryAskedRef.current.add(kit.step);
    await askOnce(kit, fen);
    return true;
  }, [askOnce, newGame]);

  return { view, plan: planThinkingLesson, start, finish: finishThinkingLesson, kitFor: kitForStep, firstFairKit, motifKit, tap, dontKnow, hold, askOnce, slipSteps: slipStepsForGame, carryOver, newGame, stop };
}
