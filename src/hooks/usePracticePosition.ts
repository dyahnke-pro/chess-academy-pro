import { useState, useCallback } from 'react';
import { stockfishEngine } from '../services/stockfishEngine';
import type { MoveResult } from './useChessGame';
import type { BoardAnnotationCommand } from '../types';
import { liveMovePrice } from '../services/playedMoveGrade';

/** The depth a practice answer is read and priced at. */
const PRACTICE_DEPTH = 16;

export interface PracticePositionState {
  fen: string;
  label: string;
}

export interface PracticeResult {
  type: 'correct' | 'wrong' | 'reveal';
  message: string;
  bestMoveUci?: string;
}

export interface UsePracticePositionReturn {
  practicePosition: PracticePositionState | null;
  practiceAttempts: number;
  handlePracticeMove: (moveResult: MoveResult) => Promise<PracticeResult>;
  exitPractice: () => void;
  setPracticeFromAnnotation: (commands: BoardAnnotationCommand[]) => void;
}

/**
 * Reusable hook for practice position evaluation.
 * Extracted from CoachGamePage — usable by any page that has a board.
 *
 * Accepts moves within 150cp of the best Stockfish move (allows coach-suggested
 * moves that aren't the engine's absolute #1 pick).
 */
export function usePracticePosition(): UsePracticePositionReturn {
  const [practicePosition, setPracticePosition] = useState<PracticePositionState | null>(null);
  const [practiceAttempts, setPracticeAttempts] = useState(0);

  const exitPractice = useCallback(() => {
    setPracticePosition(null);
    setPracticeAttempts(0);
  }, []);

  const setPracticeFromAnnotation = useCallback((commands: BoardAnnotationCommand[]) => {
    for (const cmd of commands) {
      if (cmd.type === 'practice' && cmd.fen) {
        setPracticePosition({ fen: cmd.fen, label: cmd.label ?? 'Practice position' });
        setPracticeAttempts(0);
        return;
      }
      if (cmd.type === 'clear') {
        setPracticePosition(null);
        setPracticeAttempts(0);
      }
    }
  }, []);

  const handlePracticeMove = useCallback(async (moveResult: MoveResult): Promise<PracticeResult> => {
    if (!practicePosition) {
      return { type: 'wrong', message: 'No practice position active.' };
    }

    try {
      // Analyze the position BEFORE the player's move to get the best eval
      const analysisBefore = await stockfishEngine.analyzePosition(practicePosition.fen, PRACTICE_DEPTH);
      const bestMoveUci = analysisBefore.bestMove;
      const playerUci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`;

      // Check if player played the exact best move or one of the top lines
      const isExactMatch = playerUci === bestMoveUci;
      const isTopLine = analysisBefore.topLines.some((line) => line.moves[0] === playerUci);

      if (isExactMatch || isTopLine) {
        exitPractice();
        return { type: 'correct', message: 'Correct! Great find! Well done!', bestMoveUci };
      }

      // Player didn't play a top line — price their actual move against the
      // best one in ONE search (#2 root cause 4), never the read before minus a
      // separate read after. An unpriced move is not "correct".
      const price = await liveMovePrice(practicePosition.fen, playerUci, analysisBefore, PRACTICE_DEPTH);
      if (price && price.costCp < 150) {
        exitPractice();
        return { type: 'correct', message: 'Correct! That\'s a strong move! Well done!', bestMoveUci };
      }

      // Move is significantly worse — wrong answer
      const newAttempts = practiceAttempts + 1;
      setPracticeAttempts(newAttempts);

      if (newAttempts >= 3) {
        exitPractice();
        return {
          type: 'reveal',
          message: `The best move was ${bestMoveUci}. Let's move on!`,
          bestMoveUci,
        };
      }

      return {
        type: 'wrong',
        message: `Not quite — try again! (${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} left)`,
      };
    } catch {
      exitPractice();
      return { type: 'wrong', message: 'That position couldn\'t be analyzed.' };
    }
  }, [practicePosition, practiceAttempts, exitPractice]);

  return {
    practicePosition,
    practiceAttempts,
    handlePracticeMove,
    exitPractice,
    setPracticeFromAnnotation,
  };
}
