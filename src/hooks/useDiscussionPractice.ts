// useDiscussionPractice — RETIRED to an inert stub (David 2026-06-11: "remove
// the pop-up… we did away with this path").
//
// This hook used to run a live per-move faucet: after each player move it
// evaluated the position with Stockfish and, on a slip, raised the "why did you
// play that?" pop-up (DiscussionPracticePanel) + spoke it, then logged the
// misconception. Misconception capture is now FULLY AUTOMATED from analyzed
// games (services/autoAnalyzeGame.autoAnalyzeGameMisconceptions: bulk analyze +
// coach-game finalize + single-review mount + one-time backfill), so the
// in-game interruption is redundant — and the live path couldn't dedup against
// the game-level capture anyway (no sourceGameId per move).
//
// Kept as an inert stub (every method a no-op, phase pinned to 'idle') so the
// play surfaces that mount it (CoachGamePage, CoachTeachPage, OpeningPlayMode,
// MiddlegamePractice, PlayableLinePlayer) keep their call sites unchanged: the
// DiscussionPracticePanel renders nothing on 'idle' and the voice effects never
// fire. The TYPES below stay exported because those surfaces + the panel import
// them.

import { useCallback } from 'react';

export type DiscussionPhase = 'idle' | 'asking' | 'thinking' | 'teaching';

export interface DiscussionPrompt {
  question: string;
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestSan?: string;
  mastersTopSan?: string;
  evalSummary?: string;
  cpLoss: number;
  shouldCount: boolean;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
}

export interface EvaluatePlayerMoveArgs {
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  playerColor: 'white' | 'black';
  inBook: boolean;
  bookMoveSan?: string;
  learned: boolean;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  studentRating?: number;
}

export interface RaiseSlipPromptArgs {
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestSan?: string;
  mastersTopSan?: string;
  cpLoss: number;
  shouldCount: boolean;
  reason?: 'left-book' | 'eval-drop';
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  studentRating?: number;
}

export interface UseDiscussionPracticeResult {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  teach: string | null;
  evaluatePlayerMove: (args: EvaluatePlayerMoveArgs) => Promise<void>;
  raiseSlipPrompt: (args: RaiseSlipPromptArgs) => void;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  dismissTeach: () => void;
  reset: () => void;
}

export interface UseDiscussionPracticeOptions {
  silent?: boolean;
  surface?: string;
}

/** Inert stub — the live "why did you play that?" faucet is retired (capture is
 *  automated from analyzed games). Returns a stable no-op shape so existing
 *  call sites keep working; the prompt never raises. */
export function useDiscussionPractice(
  _enabled: boolean,
  _opts: UseDiscussionPracticeOptions = {},
): UseDiscussionPracticeResult {
  const asyncNoop = useCallback(async (): Promise<void> => { /* retired */ }, []);
  const noop = useCallback((): void => { /* retired */ }, []);
  return {
    phase: 'idle',
    prompt: null,
    teach: null,
    evaluatePlayerMove: asyncNoop,
    raiseSlipPrompt: noop,
    submitReason: asyncNoop,
    skip: asyncNoop,
    dismissTeach: noop,
    reset: noop,
  };
}
