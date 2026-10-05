// useThinkingLesson — the React side of "Learn how to think": owns one
// ThinkingLessonSession, exposes its view, and forwards taps. All lesson logic
// lives in the session (services/thinkingLessonSession.ts); this hook only
// wires real voice and timers; the plan, the boards and the record come
// through the one door (services/thinkingLessonStart.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import {
  ThinkingLessonSession, IDLE_LESSON_VIEW, type LessonView, finishThinkingLesson, kitForStep, lessonInputs, planThinkingLesson, recordLessonAnswer, recordLessonChoice, rememberLessonBoardNow, saveLessonProgress, slipStepsForGame, firstFairKit, motifKit, type MotifBoard, carryOverKitFor, loadCarryOverSteps, noLessonLine,
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
  /** Run a lesson. Pass the `plan` it came from so a MIXED round runs as one;
   *  a lesson stopped part-way resumes at the board it was on. */
  start: (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[]; plan?: PlannedLesson }) => Promise<void>;
  /** A planned lesson ended: closes Up next's bite; returns the close line —
   *  what was proven, a tier that opened, what is next. */
  finish: (plan: PlannedLesson, source: string) => Promise<string | null>;
  tap: (square: Square) => void;
  /** A mixed round: the student chose which step a board asks. */
  choose: (step: string) => void;
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
  /** What to say when `plan` finds no lesson (the habit gap, or no board yet). */
  noLessonLine: () => Promise<string>;
  /** The step "Play a game on this" practises — kept here, across games,
   *  so the page holds no per-lesson ref of its own. */
  practiseKit: () => StepKit | null;
  setPractiseKit: (kit: StepKit | null) => void;
  stop: () => void;
}

const IDLE: LessonView = IDLE_LESSON_VIEW;

export function useThinkingLesson(deps: UseThinkingLessonDeps): UseThinkingLesson {
  const [view, setView] = useState<LessonView>(IDLE);
  const sessionRef = useRef<ThinkingLessonSession | null>(null);
  /** Whether the last lesson was stopped before its end: its close names no
   *  "next" — the same lesson resumes where it stopped. */
  const stoppedRef = useRef(false);
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

  const start = useCallback(async (kit: StepKit, opts: { usernames: LessonUsernames; rating: number; candidates?: readonly LessonPositionCandidate[]; plan?: PlannedLesson }): Promise<void> => {
    sessionRef.current?.stop();
    const { candidates, seen, standing, resume } = await lessonInputs(kit, opts);
    const mix = opts.plan?.kit === kit ? opts.plan.mix ?? null : null;
    const session = new ThinkingLessonSession(kit, candidates, seen, {
      say: (t) => depsRef.current.say(t),
      record: recordLessonAnswer,
      recordChoice: recordLessonChoice,
      remember: rememberLessonBoardNow,
      progress: saveLessonProgress,
      now: () => Date.now(),
      setTimer: (fn, ms) => { const id = setTimeout(fn, ms); return () => clearTimeout(id); },
      onView: (v) => { if (sessionRef.current === session) setView(v); },
    }, mix);
    sessionRef.current = session;
    stoppedRef.current = false;
    await session.run(standing, { resume });
    stoppedRef.current = session.wasStopped;
    if (sessionRef.current === session) sessionRef.current = null;
  }, []);

  const tap = useCallback((square: Square): void => { void sessionRef.current?.tap(square); }, []);
  const dontKnow = useCallback((): void => { void sessionRef.current?.dontKnow(); }, []);
  const choose = useCallback((step: string): void => { sessionRef.current?.choose(step); }, []);
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

  const practiseRef = useRef<StepKit | null>(null);
  const practiseKit = useCallback((): StepKit | null => practiseRef.current, []);
  const setPractiseKit = useCallback((kit: StepKit | null): void => { practiseRef.current = kit; }, []);

  const finish = useCallback((plan: PlannedLesson, source: string): Promise<string | null> =>
    finishThinkingLesson(plan, source, { stopped: stoppedRef.current }), []);

  return { view, plan: planThinkingLesson, start, finish, kitFor: kitForStep, firstFairKit, motifKit, tap, choose, dontKnow, hold, askOnce, slipSteps: slipStepsForGame, carryOver, newGame, noLessonLine, practiseKit, setPractiseKit, stop };
}
