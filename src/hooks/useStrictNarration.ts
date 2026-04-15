// useStrictNarration — promise-gated narration playback for chess lessons.
//
// Replaces the previous race-prone model in WalkthroughMode where:
//   - a 30-second safety timeout AND `voiceService.speak().then()` AND a
//     boundary-fallback timer all competed to advance the move
//   - "Next" presses could leave stale callbacks pending which then advanced
//     the wrong step
//
// The new contract:
//   - `play(stepIndex)` instantly applies the new board state, then awaits
//     `voiceService.speak()`. Manual presses (or stops) supersede in-flight
//     speech via a token counter — stale resolutions are discarded.
//   - In auto-play mode, the *next* step is scheduled only after the current
//     speech promise resolves, plus a small post-narration buffer.
//   - Voice completion is the single source of truth for advance — no fallback
//     timers compete with it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';

export interface UseStrictNarrationOptions {
  /** Total number of steps in the lesson. */
  stepCount: number;
  /** Apply the board state for `stepIndex` (synchronous). */
  applyStep: (stepIndex: number) => void;
  /** Get the text the voice service should speak for `stepIndex`.
   *  Return an empty string to skip narration for this step. */
  getNarration: (stepIndex: number) => string;
  /** Auto-advance speed config. */
  postNarrationDelayMs: number;
  /** Whether voice playback is enabled at all (user setting + speed tier). */
  voiceEnabled: boolean;
  /** Initial step index (defaults to 0). */
  initialStepIndex?: number;
}

export interface UseStrictNarrationReturn {
  currentStep: number;
  isAutoPlaying: boolean;
  isSpeaking: boolean;
  /** Jump to a specific step, cancelling any in-flight speech. Pauses auto-play. */
  goToStep: (stepIndex: number) => void;
  /** Advance to the next step, cancelling speech. Pauses auto-play. */
  next: () => void;
  /** Step back, cancelling speech. Pauses auto-play. */
  prev: () => void;
  /** Toggle auto-play. When starting from the end, resets to step 0 first. */
  toggleAutoPlay: () => void;
  /** Stop speech and pause. Useful for cleanup on unmount. */
  stopAll: () => void;
  /** Re-trigger speech for the current step. Use when narration data loads
   *  asynchronously (e.g. from IndexedDB) after the step is already showing. */
  replay: () => void;
}

export function useStrictNarration({
  stepCount,
  applyStep,
  getNarration,
  postNarrationDelayMs,
  voiceEnabled,
  initialStepIndex = 0,
}: UseStrictNarrationOptions): UseStrictNarrationReturn {
  const [currentStep, setCurrentStep] = useState(initialStepIndex);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Token incremented on every advance/pause/stop. Stale speech resolutions
  // check this before triggering the next step.
  const tokenRef = useRef(0);
  const isAutoPlayingRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest closures — avoids stale captures inside the speech promise chain.
  const applyStepRef = useRef(applyStep);
  const getNarrationRef = useRef(getNarration);
  const postNarrationDelayRef = useRef(postNarrationDelayMs);
  const voiceEnabledRef = useRef(voiceEnabled);
  const stepCountRef = useRef(stepCount);

  useEffect(() => { applyStepRef.current = applyStep; }, [applyStep]);
  useEffect(() => { getNarrationRef.current = getNarration; }, [getNarration]);
  useEffect(() => { postNarrationDelayRef.current = postNarrationDelayMs; }, [postNarrationDelayMs]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { stepCountRef.current = stepCount; }, [stepCount]);
  useEffect(() => { isAutoPlayingRef.current = isAutoPlaying; }, [isAutoPlaying]);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  /** Speak narration for the given step, then (in auto-play) schedule the next.
   *  Each call increments the token; only the latest call's resolution can
   *  advance auto-play. */
  const playStep = useCallback(
    (stepIndex: number): void => {
      const myToken = ++tokenRef.current;
      voiceService.stop();
      clearAdvanceTimer();
      applyStepRef.current(stepIndex);

      const narration = voiceEnabledRef.current ? getNarrationRef.current(stepIndex) : '';

      if (!narration) {
        // No speech for this step. In auto-play, advance after the buffer delay.
        if (isAutoPlayingRef.current && stepIndex < stepCountRef.current - 1) {
          advanceTimerRef.current = setTimeout(() => {
            if (myToken !== tokenRef.current) return;
            playStep(stepIndex + 1);
          }, Math.max(postNarrationDelayRef.current, 800));
        } else if (stepIndex >= stepCountRef.current - 1) {
          setIsAutoPlaying(false);
        }
        return;
      }

      setIsSpeaking(true);
      void voiceService.speak(narration).finally(() => {
        if (myToken !== tokenRef.current) {
          // A newer call has superseded us; do nothing — the new call owns state.
          return;
        }
        setIsSpeaking(false);
        if (!isAutoPlayingRef.current) return;
        if (stepIndex >= stepCountRef.current - 1) {
          setIsAutoPlaying(false);
          return;
        }
        advanceTimerRef.current = setTimeout(() => {
          if (myToken !== tokenRef.current) return;
          playStep(stepIndex + 1);
        }, postNarrationDelayRef.current);
      });
    },
    [clearAdvanceTimer],
  );

  // Re-play whenever the current step changes (manual nav). The token-based
  // supersession ensures only the latest playStep can affect state.
  useEffect(() => {
    playStep(currentStep);
    // We deliberately depend ONLY on currentStep here. The other inputs are
    // read via refs so changing speed mid-step doesn't restart playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // When auto-play turns ON, restart playback from the current step. The token
  // counter inside playStep ensures any in-flight speech becomes stale, so the
  // newly-issued speech is the only one that can advance auto-play. Restarting
  // is preferable to relying on the prior speech's .finally because there is a
  // small window where isAutoPlayingRef.current is not yet true when an
  // already-resolved promise's callback fires.
  // When auto-play turns OFF, stop voice and cancel pending advances.
  useEffect(() => {
    if (isAutoPlaying) {
      playStep(currentStep);
    } else {
      tokenRef.current++;
      clearAdvanceTimer();
      voiceService.stop();
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlaying]);

  // Cleanup on unmount. Capture the ref into a local so the cleanup closure
  // doesn't read .current at unmount time (its value would be the latest
  // counter, which is what we want — but the lint rule complains about
  // ref-in-cleanup; this pattern is correct for our intent of supersession).
  useEffect(() => {
    const tokens = tokenRef;
    return () => {
      tokens.current++;
      clearAdvanceTimer();
      voiceService.stop();
    };
  }, [clearAdvanceTimer]);

  const goToStep = useCallback(
    (stepIndex: number) => {
      const clamped = Math.max(0, Math.min(stepCountRef.current, stepIndex));
      setIsAutoPlaying(false);
      setCurrentStep(clamped);
    },
    [],
  );

  const next = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentStep((prev) => Math.min(stepCountRef.current, prev + 1));
  }, []);

  const prev = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((wasPlaying) => {
      if (wasPlaying) return false;
      // Starting — reset to 0 if we're at or past the end.
      if (currentStep >= stepCountRef.current - 1) {
        setCurrentStep(0);
      }
      return true;
    });
  }, [currentStep]);

  const stopAll = useCallback(() => {
    tokenRef.current++;
    clearAdvanceTimer();
    voiceService.stop();
    setIsAutoPlaying(false);
    setIsSpeaking(false);
  }, [clearAdvanceTimer]);

  const replay = useCallback(() => {
    playStep(currentStep);
  }, [playStep, currentStep]);

  return {
    currentStep,
    isAutoPlaying,
    isSpeaking,
    goToStep,
    next,
    prev,
    toggleAutoPlay,
    stopAll,
    replay,
  };
}
