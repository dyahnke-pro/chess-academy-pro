/**
 * useWalkthroughRunner
 * --------------------
 * React hook that drives a WalkthroughSession: current step, current
 * FEN, next/prev/play/pause controls, and strict voice-gated auto-play
 * (see `services/walkthroughRunner.ts`).
 *
 * Used by the new coach-session route and (eventually) the Openings
 * walkthrough. See CLAUDE.md → "Agent Coach Pattern".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runStep } from '../services/walkthroughRunner';
import { voiceService } from '../services/voiceService';
import type { WalkthroughSession, WalkthroughStep } from '../types/walkthrough';

const DEFAULT_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface UseWalkthroughRunnerReturn {
  /** The step currently shown on the board (null before any step plays). */
  currentStep: WalkthroughStep | null;
  /** 0-based index of the current step; -1 before the first step. */
  currentIndex: number;
  /** FEN of the current position on the board. */
  fen: string;
  /** True while auto-play is running. */
  isPlaying: boolean;
  /** True when the session has played every step. */
  isFinished: boolean;
  /** Advance one step. Cancels any in-flight narration. */
  next: () => void;
  /** Step back one move. Cancels narration and rewinds board state. */
  prev: () => void;
  /** Start auto-play from the current index. */
  play: () => void;
  /** Pause auto-play and stop narration. */
  pause: () => void;
  /** Jump back to the first step (pre-start state). */
  restart: () => void;
}

export function useWalkthroughRunner(
  session: WalkthroughSession,
  options: { silent?: boolean; speed?: number } = {},
): UseWalkthroughRunnerReturn {
  const { silent = false, speed = 1 } = options;
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const cancelRef = useRef<(() => void) | null>(null);
  // When a new session is passed in we need to reset everything.
  const sessionKey = useMemo(
    () => `${session.title}:${session.steps.length}`,
    [session.title, session.steps.length],
  );

  const startFen = session.startFen ?? DEFAULT_START_FEN;

  const fen = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= session.steps.length) return startFen;
    return session.steps[currentIndex].fenAfter;
  }, [currentIndex, session.steps, startFen]);

  const currentStep =
    currentIndex >= 0 && currentIndex < session.steps.length
      ? session.steps[currentIndex]
      : null;
  const isFinished =
    session.steps.length > 0 && currentIndex >= session.steps.length - 1;

  const cancelInFlight = useCallback((): void => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    voiceService.stop();
  }, []);

  const pause = useCallback((): void => {
    cancelInFlight();
    setIsPlaying(false);
  }, [cancelInFlight]);

  const next = useCallback((): void => {
    cancelInFlight();
    setCurrentIndex((idx) => Math.min(idx + 1, session.steps.length - 1));
  }, [cancelInFlight, session.steps.length]);

  const prev = useCallback((): void => {
    cancelInFlight();
    setIsPlaying(false);
    setCurrentIndex((idx) => Math.max(idx - 1, -1));
  }, [cancelInFlight]);

  const play = useCallback((): void => {
    setIsPlaying(true);
    // If we're already past the end, restart from the beginning.
    setCurrentIndex((idx) => (idx >= session.steps.length - 1 ? -1 : idx));
  }, [session.steps.length]);

  const restart = useCallback((): void => {
    cancelInFlight();
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, [cancelInFlight]);

  // Session changed — reset state.
  useEffect(() => {
    cancelInFlight();
    setIsPlaying(false);
    setCurrentIndex(-1);
    // sessionKey captures identity; only re-run on actual session change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // Narrate the current step. When auto-playing, advance on completion.
  useEffect(() => {
    const step = currentIndex >= 0 ? session.steps[currentIndex] : null;
    if (!step) return;

    let aborted = false;
    const { done, cancel } = runStep(step, { silent, speed });
    cancelRef.current = cancel;

    void done.then((result) => {
      if (aborted) return;
      cancelRef.current = null;
      if (result.cancelled) return;
      // Only auto-advance when playing and not at the end.
      if (isPlaying && currentIndex < session.steps.length - 1) {
        setCurrentIndex((idx) => Math.min(idx + 1, session.steps.length - 1));
      } else if (isPlaying && currentIndex >= session.steps.length - 1) {
        setIsPlaying(false);
      }
    });

    return () => {
      aborted = true;
      cancel();
    };
    // `isPlaying` intentionally included so pressing play after a
    // manual step resumes auto-advance from the current position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, sessionKey, isPlaying, silent, speed]);

  // Kick off the first step when play starts from the pre-start state.
  useEffect(() => {
    if (isPlaying && currentIndex === -1 && session.steps.length > 0) {
      setCurrentIndex(0);
    }
  }, [isPlaying, currentIndex, session.steps.length]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  return {
    currentStep,
    currentIndex,
    fen,
    isPlaying,
    isFinished,
    next,
    prev,
    play,
    pause,
    restart,
  };
}
