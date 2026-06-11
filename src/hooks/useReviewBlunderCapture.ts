// Review-game conversation faucet — the per-blunder "why did you play
// that?" capture (David 2026-05-21). As the Game Review walk lands on the
// player's own blunder/mistake plies, the coach asks why; the answer is
// classified into a closed-set misconception and logged to the shared
// bucket (source 'game-review'). Skippable per blunder. Reuses the tested
// captureMisconception orchestrator; this hook just manages the per-ply
// trigger + prompt state. The LLM classification can't run headless (G7),
// so the wiring is what's verified here, not the live tag.

import { useCallback, useRef, useState } from 'react';
import { captureMisconception } from '../services/discussionPractice';
import { classifyPhase } from '../services/gamePhaseService';
import type { CoachGameMove } from '../types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type ReviewCapturePhase = 'idle' | 'asking' | 'thinking' | 'teaching';

export interface ReviewCapturePrompt {
  ply: number;
  fen: string;        // position BEFORE the blundered move
  playedSan: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber: number;
}

export interface UseReviewBlunderCaptureArgs {
  moves: CoachGameMove[];
  playerColor: 'white' | 'black';
  openingName?: string | null;
  openingId?: string;
  gameId?: string;
  /** Count-against gate: a reviewed game the student should know. A
   *  deliberate review of one's own game counts. */
  learned?: boolean;
}

export interface UseReviewBlunderCaptureResult {
  phase: ReviewCapturePhase;
  prompt: ReviewCapturePrompt | null;
  teach: string | null;
  /** Call when the review walk lands on a ply (e.g. currentPly change).
   *  Raises the prompt iff that ply is the player's own blunder/mistake
   *  and hasn't been asked this session. */
  onPlyLanded: (ply: number) => void;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  dismissTeach: () => void;
}

/** Is the move at this ply the PLAYER's own blunder/mistake worth asking
 *  about? ply is 1-based (0 = start position). */
function blunderAtPly(
  moves: CoachGameMove[],
  ply: number,
  playerColor: 'white' | 'black',
): ReviewCapturePrompt | null {
  if (ply < 1 || ply > moves.length) return null;
  const idx = ply - 1;
  const move = moves[idx];
  const side = idx % 2 === 0 ? 'white' : 'black';
  if (side !== playerColor) return null;
  if (move.classification !== 'blunder' && move.classification !== 'mistake') return null;
  const sign = playerColor === 'white' ? 1 : -1;
  const cpLoss =
    move.preMoveEval !== null && move.evaluation !== null
      ? (move.preMoveEval - move.evaluation) * sign
      : undefined;
  const fenBefore = idx > 0 ? moves[idx - 1].fen : START_FEN;
  return {
    ply,
    fen: fenBefore,
    playedSan: move.san,
    bestSan: move.bestMove ?? undefined,
    cpLoss: cpLoss !== undefined && cpLoss > 0 ? cpLoss : undefined,
    // Material-aware phase (opening / middlegame / endgame) so an endgame
    // slip caught in review is filed as endgame — not mislabeled middlegame
    // by a move-count heuristic.
    gamePhase: classifyPhase(fenBefore, ply),
    moveNumber: move.moveNumber,
  };
}

export function useReviewBlunderCapture(
  args: UseReviewBlunderCaptureArgs,
): UseReviewBlunderCaptureResult {
  const { moves, playerColor, openingName, openingId, gameId, learned = true } = args;
  const [phase, setPhase] = useState<ReviewCapturePhase>('idle');
  const [prompt, setPrompt] = useState<ReviewCapturePrompt | null>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const askedPlies = useRef<Set<number>>(new Set());
  // The ply the open prompt / teaching note belongs to. A prompt is pinned to
  // its OWN blunder ply; if the walk has since moved elsewhere the user
  // navigated away without answering, and the prompt must be dropped so it
  // doesn't haunt every later position (and the opponent's moves) with a stale
  // "You played <that move>…?" — the bug David caught 2026-06-11.
  const boundPlyRef = useRef<number | null>(null);

  const onPlyLanded = useCallback((ply: number): void => {
    if (phase !== 'idle') {
      // 'thinking' is an async classification in flight — never interrupt it.
      if (phase === 'thinking') return;
      // An 'asking'/'teaching' prompt still sitting on its own ply stays put
      // (this effect re-fires on every render with the same ply).
      if (boundPlyRef.current === ply) return;
      // Otherwise the walk has moved off the prompt's ply — drop it and fall
      // through to evaluate the ply we actually landed on.
      setPrompt(null);
      setTeach(null);
      setPhase('idle');
      boundPlyRef.current = null;
    }
    if (askedPlies.current.has(ply)) return;
    const p = blunderAtPly(moves, ply, playerColor);
    if (!p) return;
    askedPlies.current.add(ply);
    boundPlyRef.current = ply;
    setPrompt(p);
    setPhase('asking');
  }, [phase, moves, playerColor]);

  const resolve = useCallback(async (reason: string | undefined): Promise<void> => {
    if (!prompt) return;
    setPhase('thinking');
    const result = await captureMisconception({
      classifyInput: {
        fen: prompt.fen,
        playedSan: prompt.playedSan,
        bestSan: prompt.bestSan,
        gamePhase: prompt.gamePhase,
        userReason: reason,
      },
      source: 'game-review',
      shouldCount: learned,
      context: {
        fen: prompt.fen,
        playedSan: prompt.playedSan,
        bestSan: prompt.bestSan,
        cpLoss: prompt.cpLoss,
        gamePhase: prompt.gamePhase,
        moveNumber: prompt.moveNumber,
        openingId,
        openingName: openingName ?? undefined,
        sourceGameId: gameId,
      },
    });
    setPrompt(null);
    setTeach(result.coachNote || null);
    setPhase(result.coachNote ? 'teaching' : 'idle');
  }, [prompt, learned, openingId, openingName, gameId]);

  const submitReason = useCallback((reason: string) => resolve(reason), [resolve]);
  const skip = useCallback(() => resolve(undefined), [resolve]);
  const dismissTeach = useCallback(() => { setTeach(null); setPhase('idle'); }, []);

  return { phase, prompt, teach, onPlyLanded, submitReason, skip, dismissTeach };
}
