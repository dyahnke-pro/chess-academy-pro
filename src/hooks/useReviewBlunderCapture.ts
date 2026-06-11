// useReviewBlunderCapture — RETIRED to an inert stub (David 2026-06-11:
// "remove the pop-up… we did away with this path").
//
// This hook used to raise the "You played X — what was the idea behind it?"
// pop-up as the review walk landed on each of the student's blunder plies,
// then classify the answer and log it. Misconception capture is now AUTOMATED:
// opening a game review runs services/autoAnalyzeGame.autoAnalyzeGameMisconceptions
// on mount (and the bulk analyze + backfill cover the rest), so the per-ply
// interruption is redundant.
//
// Kept as an inert stub (phase pinned to 'idle', methods no-op) so CoachGameReview
// keeps its call sites unchanged — the capture card never renders. Types stay
// exported for the consumer.

import { useCallback } from 'react';

export type ReviewCapturePhase = 'idle' | 'asking' | 'thinking' | 'teaching';

export interface ReviewCapturePrompt {
  ply: number;
  fen: string;
  playedSan: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber: number;
}

export interface UseReviewBlunderCaptureArgs {
  moves: unknown[];
  playerColor: 'white' | 'black';
  openingName?: string | null;
  openingId?: string;
  gameId?: string;
  learned?: boolean;
}

export interface UseReviewBlunderCaptureResult {
  phase: ReviewCapturePhase;
  prompt: ReviewCapturePrompt | null;
  teach: string | null;
  onPlyLanded: (ply: number) => void;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  dismissTeach: () => void;
}

/** Inert stub — the interactive review "why?" prompt is retired (capture is
 *  automated on review mount). Returns a stable no-op shape; nothing renders. */
export function useReviewBlunderCapture(
  _args: UseReviewBlunderCaptureArgs,
): UseReviewBlunderCaptureResult {
  const asyncNoop = useCallback(async (): Promise<void> => { /* retired */ }, []);
  const noop = useCallback((): void => { /* retired */ }, []);
  return {
    phase: 'idle',
    prompt: null,
    teach: null,
    onPlyLanded: noop,
    submitReason: asyncNoop,
    skip: asyncNoop,
    dismissTeach: noop,
  };
}
