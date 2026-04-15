/**
 * walkthroughRunner
 * -----------------
 * Strict "one thing at a time" narration timing for any lesson-style
 * session driven by WalkthroughStep[].
 *
 * Contract:
 *  1. Board updates instantly when a step advances.
 *  2. Any in-flight narration is cancelled immediately.
 *  3. The new step's narration starts speaking.
 *  4. Auto-play is gated primarily on `voiceService.speak()` resolving.
 *     A word-count backup timer is kept as a secondary safety net so a
 *     silent TTS failure never stalls playback.
 *  5. Manual advance (next / prev) always overrides and cancels any
 *     pending auto-advance.
 *
 * The runner is framework-agnostic — it does not touch React. The
 * `useWalkthroughRunner` hook wraps it with React state.
 */
import { voiceService } from './voiceService';
import type { WalkthroughStep } from '../types/walkthrough';

/** Words per minute used to compute the backup timer. */
const BACKUP_WPM = 180;
/** Minimum backup delay in ms so a one-word narration still gets a pause. */
const MIN_BACKUP_MS = 1500;
/** Max backup delay — if voice hasn't finished by now we assume it failed. */
const MAX_BACKUP_MS = 20_000;
/** Quiet buffer added after narration resolves before advancing. */
const POST_NARRATION_BUFFER_MS = 400;

export interface RunStepOptions {
  /** When true, skip all voice playback (e.g. user muted lesson). */
  silent?: boolean;
  /** Narration speed multiplier — affects both voice rate and backup timer. */
  speed?: number;
}

export interface RunStepResult {
  /** Did the step complete (narration ended naturally)? */
  completed: boolean;
  /** Was the step cancelled by the caller? */
  cancelled: boolean;
  /** Did we fall through to the safety-net timeout? */
  timedOut: boolean;
}

/**
 * Speak one step's narration with strict timing. Returns a cancel fn
 * so the caller can interrupt (e.g. on manual "Next").
 *
 * The returned promise resolves once the step should advance — either
 * because the voice finished, or the backup timer fired, or the caller
 * cancelled.
 */
export function runStep(
  step: WalkthroughStep,
  options: RunStepOptions = {},
): { done: Promise<RunStepResult>; cancel: () => void } {
  const { silent = false, speed = 1 } = options;

  let cancelled = false;
  let settled = false;
  let backupTimer: ReturnType<typeof setTimeout> | null = null;
  let resolve!: (r: RunStepResult) => void;

  const done = new Promise<RunStepResult>((r) => {
    resolve = r;
  });

  const settle = (result: RunStepResult): void => {
    if (settled) return;
    settled = true;
    if (backupTimer) {
      clearTimeout(backupTimer);
      backupTimer = null;
    }
    resolve(result);
  };

  const cancel = (): void => {
    if (settled) return;
    cancelled = true;
    voiceService.stop();
    settle({ completed: false, cancelled: true, timedOut: false });
  };

  if (silent || !step.narration) {
    settle({ completed: true, cancelled: false, timedOut: false });
    return { done, cancel };
  }

  // Start the backup timer BEFORE we kick off speech, so a TTS
  // hang/failure can't stall us forever.
  const backupMs = clampBackupMs(step.narration, speed);
  backupTimer = setTimeout(() => {
    if (cancelled || settled) return;
    voiceService.stop();
    settle({ completed: false, cancelled: false, timedOut: true });
  }, backupMs);

  // Primary gate: voice completion.
  voiceService
    .speak(step.narration)
    .then(() => {
      if (cancelled || settled) return;
      // Small quiet buffer before advancing — keeps the lesson from
      // feeling too chatty.
      setTimeout(() => {
        settle({ completed: true, cancelled: false, timedOut: false });
      }, POST_NARRATION_BUFFER_MS);
    })
    .catch(() => {
      if (cancelled || settled) return;
      // Voice errored — fall back to the backup timer.
    });

  return { done, cancel };
}

/**
 * Compute the backup timer duration for a given narration string.
 * Public so tests and UI (progress bars) can reason about expected
 * step duration.
 */
export function clampBackupMs(text: string, speed: number = 1): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const baseMs = (wordCount / BACKUP_WPM) * 60_000;
  // Longer-than-speech buffer: give voice 1.6× the expected reading
  // time before we assume it failed. Divide by speed so faster
  // playback doesn't trigger a premature timeout.
  const scaled = (baseMs * 1.6) / Math.max(speed, 0.25);
  return Math.max(MIN_BACKUP_MS, Math.min(MAX_BACKUP_MS, scaled));
}
