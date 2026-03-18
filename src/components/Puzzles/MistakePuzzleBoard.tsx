import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { movesForDifficulty } from '../../services/mistakePuzzleService';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MistakePuzzle, MistakeClassification, MistakePuzzleDifficulty } from '../../types';

type PuzzleState = 'playing' | 'correct' | 'incorrect';

interface MistakePuzzleBoardProps {
  puzzle: MistakePuzzle;
  difficulty: MistakePuzzleDifficulty;
  onComplete: (correct: boolean) => void;
}

const CLASSIFICATION_BADGE: Record<MistakeClassification, { label: string; symbol: string; color: string }> = {
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'text-yellow-500 bg-yellow-500/10' },
  mistake: { label: 'Mistake', symbol: '?', color: 'text-orange-500 bg-orange-500/10' },
  blunder: { label: 'Blunder', symbol: '??', color: 'text-red-500 bg-red-500/10' },
};

function parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4) : undefined,
  };
}

export function MistakePuzzleBoard({ puzzle, difficulty, onComplete }: MistakePuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('playing');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const chessRef = useRef(new Chess(puzzle.fen));
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();

  const badge = CLASSIFICATION_BADGE[puzzle.classification];

  // Compute the active move sequence based on difficulty
  const activeMoves = useMemo(() => {
    const continuation = puzzle.continuationMoves.length > 0
      ? puzzle.continuationMoves
      : [puzzle.bestMove];
    return movesForDifficulty(continuation, difficulty);
  }, [puzzle.continuationMoves, puzzle.bestMove, difficulty]);

  const isMultiMove = activeMoves.length > 1;
  // Total player moves = moves at even indices (0, 2, 4, ...)
  const totalPlayerMoves = Math.ceil(activeMoves.length / 2);
  // Current player move number (1-indexed)
  const currentPlayerMove = Math.floor(moveIndex / 2) + 1;

  // Reset state when puzzle or difficulty changes
  useEffect(() => {
    chessRef.current = new Chess(puzzle.fen);
    setFen(puzzle.fen);
    setMoveIndex(0);
    setState('playing');
  }, [puzzle, difficulty]);

  const handleMove = useCallback((moveResult: MoveResult): void => {
    if (state !== 'playing') return;
    if (moveIndex >= activeMoves.length) return;

    // Sync with our chess instance
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Already applied
    }
    setFen(chessRef.current.fen());

    // Check if the move matches the expected move
    const playerUci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    const expectedMove = activeMoves[moveIndex];
    const isCorrect = playerUci === expectedMove;

    if (isCorrect) {
      playMoveSound(moveResult.san);
      const nextIndex = moveIndex + 1;

      // Check if puzzle is fully solved
      if (nextIndex >= activeMoves.length) {
        setState('correct');
        playCelebration();
        onComplete(true);
        return;
      }

      // Auto-play opponent's response (next move in sequence)
      if (nextIndex < activeMoves.length) {
        const opponentMove = parseUciMove(activeMoves[nextIndex]);
        setTimeout(() => {
          try {
            const result = chessRef.current.move({
              from: opponentMove.from,
              to: opponentMove.to,
              promotion: opponentMove.promotion,
            });
            playMoveSound(result.san);
            setFen(chessRef.current.fen());
          } catch {
            // skip invalid opponent move
          }
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      // Wrong move — undo and show feedback
      chessRef.current.undo();
      setFen(chessRef.current.fen());
      setState('incorrect');
      playEncouragement();

      if (isMultiMove) {
        // Allow retry after brief pause for multi-move
        setTimeout(() => {
          setState('playing');
        }, 1500);
      } else {
        // Single-move: show answer then complete
        setTimeout(() => {
          onComplete(false);
        }, 2000);
      }
    }
  }, [state, moveIndex, activeMoves, isMultiMove, onComplete, playMoveSound, playCelebration, playEncouragement]);

  // Build arrows showing the correct/wrong moves on incorrect state (single-move only)
  const arrows = state === 'incorrect' && !isMultiMove ? [
    {
      startSquare: puzzle.playerMove.slice(0, 2),
      endSquare: puzzle.playerMove.slice(2, 4),
      color: 'rgba(239,68,68,0.4)',
    },
    {
      startSquare: puzzle.bestMove.slice(0, 2),
      endSquare: puzzle.bestMove.slice(2, 4),
      color: 'rgba(34,197,94,0.6)',
    },
  ] : undefined;

  return (
    <div className="space-y-3" data-testid="mistake-puzzle-board">
      {/* Header with classification badge and prompt */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}
          data-testid="classification-badge"
        >
          <AlertTriangle size={12} />
          {badge.symbol} {badge.label}
        </span>
        <span className="text-xs text-theme-text-muted">
          From your game
        </span>
      </div>

      <p className="text-sm text-theme-text-secondary" data-testid="prompt-text">
        {puzzle.promptText}
      </p>

      {/* Progress indicator for multi-move */}
      {isMultiMove && state === 'playing' && (
        <div className="flex items-center gap-2" data-testid="move-progress">
          <span className="text-xs font-medium text-theme-text-muted">
            Move {currentPlayerMove} of {totalPlayerMoves}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalPlayerMoves }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < currentPlayerMove - 1
                    ? 'bg-green-500'
                    : i === currentPlayerMove - 1
                      ? 'bg-theme-accent'
                      : 'bg-theme-border'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Board */}
      <div className="w-full md:max-w-[420px] mx-auto">
        <ChessBoard
          initialFen={fen}
          key={fen}
          orientation={puzzle.playerColor}
          interactive={state === 'playing'}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleMove}
          arrows={arrows}
        />
      </div>

      {/* Status feedback */}
      {state === 'correct' && (
        <div className="flex items-center gap-2 text-green-500" data-testid="puzzle-correct">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">
            {isMultiMove
              ? `Correct! You found all ${totalPlayerMoves} moves.`
              : `Correct! The best move was ${puzzle.bestMoveSan}.`
            }
          </span>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-500" data-testid="puzzle-incorrect">
          <XCircle size={18} />
          <span className="text-sm font-medium">
            {isMultiMove
              ? 'Not quite — try again.'
              : `The best move was ${puzzle.bestMoveSan}. You originally played ${puzzle.playerMove.slice(0, 2)}-${puzzle.playerMove.slice(2, 4)}.`
            }
          </span>
        </div>
      )}

      {/* Puzzle info */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted">
        <span>Move {puzzle.moveNumber}</span>
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.cpLoss}cp loss</span>
        {isMultiMove && (
          <>
            <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
            <span className="capitalize">{difficulty}</span>
          </>
        )}
      </div>
    </div>
  );
}
