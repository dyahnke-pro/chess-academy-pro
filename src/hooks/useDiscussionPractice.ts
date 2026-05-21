// useDiscussionPractice — the live faucet's React shell over the tested
// orchestration in services/discussionPractice.ts. Mounts on a play
// surface; after each player move it (best-effort, never blocking the
// game) evaluates the move, and on a real slip raises a "why did you
// play that?" prompt. The student answers (voice/text) or skips; either
// way the coach teaches, and a counted slip is logged to the weakness
// bucket. All engine/lookup work is wrapped so a failure just means "no
// prompt this move" — the game never stalls.

import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import { lookupMasterPlay } from '../services/masterPlayLookup';
import { describeTopMasterMove } from '../services/explorerTranslate';
import {
  evaluateMove,
  buildWhyPrompt,
  captureMisconception,
} from '../services/discussionPractice';

export type DiscussionPhase = 'idle' | 'asking' | 'thinking' | 'teaching';

export interface DiscussionPrompt {
  question: string;
  /** Carried so submit/skip can classify with full context. */
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
}

export interface UseDiscussionPracticeResult {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  /** The coach's teaching line to speak/show after answer or skip. */
  teach: string | null;
  evaluatePlayerMove: (args: EvaluatePlayerMoveArgs) => Promise<void>;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  dismissTeach: () => void;
  reset: () => void;
}

function cpToWords(cpLoss: number): string {
  const pawns = cpLoss / 100;
  if (pawns >= 3) return 'loses a lot of material or the game';
  if (pawns >= 1.5) return 'drops a piece’s worth of advantage';
  if (pawns >= 0.8) return 'loses about a pawn';
  return 'gives away a little something';
}

export function useDiscussionPractice(
  enabled: boolean,
): UseDiscussionPracticeResult {
  const [phase, setPhase] = useState<DiscussionPhase>('idle');
  const [prompt, setPrompt] = useState<DiscussionPrompt | null>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const openingIdRef = useRef<string | undefined>(undefined);
  const openingNameRef = useRef<string | undefined>(undefined);

  const evaluatePlayerMove = useCallback(async (args: EvaluatePlayerMoveArgs): Promise<void> => {
    if (!enabled) return;
    openingIdRef.current = args.openingId;
    openingNameRef.current = args.openingName;
    try {
      // Eval the position before (best move + eval) and after the move.
      // 'prefetch' priority so we don't contend with the opponent engine.
      const [before, after] = await Promise.all([
        stockfishEngine.analyzePosition(args.fenBefore, 12, undefined, 'prefetch'),
        stockfishEngine.analyzePosition(args.fenAfter, 12, undefined, 'prefetch'),
      ]);
      const sign = args.playerColor === 'white' ? 1 : -1;
      const evalBeforeCp = before.evaluation * sign;
      const evalAfterCp = after.evaluation * sign;

      const slip = evaluateMove({
        inBook: args.inBook,
        bookMoveSan: args.bookMoveSan,
        playedSan: args.playedSan,
        evalBeforeCp,
        evalAfterCp,
        learned: args.learned,
      });
      if (!slip.isSlip) return;

      // Resolve the better move (SAN) and the masters' move for context.
      let bestSan: string | undefined;
      try {
        if (before.bestMove && before.bestMove.length >= 4) {
          const c = new Chess(args.fenBefore);
          const mv = c.move({
            from: before.bestMove.slice(0, 2),
            to: before.bestMove.slice(2, 4),
            promotion: before.bestMove.length > 4 ? before.bestMove[4] : undefined,
          });
          bestSan = mv.san;
        }
      } catch { /* leave bestSan undefined */ }

      let mastersTopSan: string | undefined;
      try {
        const masters = await lookupMasterPlay(args.fenBefore, {
          triggeredBy: 'manual',
          surface: 'discussion-practice',
          localOnly: true,
        });
        const top = describeTopMasterMove(masters, args.playerColor);
        mastersTopSan = top?.san;
      } catch { /* no masters data */ }

      setPrompt({
        question: buildWhyPrompt(slip),
        fenBefore: args.fenBefore,
        fenAfter: args.fenAfter,
        playedSan: args.playedSan,
        bestSan,
        mastersTopSan,
        evalSummary: cpToWords(slip.cpLoss),
        cpLoss: slip.cpLoss,
        shouldCount: slip.shouldCount,
        gamePhase: args.gamePhase,
        moveNumber: args.moveNumber,
      });
      setPhase('asking');
    } catch {
      // Any failure → no prompt this move. Never block the game.
    }
  }, [enabled]);

  const resolve = useCallback(async (reason: string | undefined): Promise<void> => {
    if (!prompt) return;
    setPhase('thinking');
    const result = await captureMisconception({
      classifyInput: {
        fen: prompt.fenBefore,
        playedSan: prompt.playedSan,
        bestSan: prompt.bestSan,
        mastersTopSan: prompt.mastersTopSan,
        evalSummary: prompt.evalSummary,
        gamePhase: prompt.gamePhase,
        userReason: reason,
      },
      source: 'discussion-practice',
      shouldCount: prompt.shouldCount,
      context: {
        fen: prompt.fenBefore,
        playedSan: prompt.playedSan,
        bestSan: prompt.bestSan,
        cpLoss: prompt.cpLoss,
        gamePhase: prompt.gamePhase,
        moveNumber: prompt.moveNumber,
        openingId: openingIdRef.current,
        openingName: openingNameRef.current,
      },
    });
    setPrompt(null);
    setTeach(result.coachNote || null);
    setPhase(result.coachNote ? 'teaching' : 'idle');
  }, [prompt]);

  const submitReason = useCallback((reason: string) => resolve(reason), [resolve]);
  const skip = useCallback(() => resolve(undefined), [resolve]);

  const dismissTeach = useCallback(() => {
    setTeach(null);
    setPhase('idle');
  }, []);

  const reset = useCallback(() => {
    setPrompt(null);
    setTeach(null);
    setPhase('idle');
  }, []);

  return { phase, prompt, teach, evaluatePlayerMove, submitReason, skip, dismissTeach, reset };
}
