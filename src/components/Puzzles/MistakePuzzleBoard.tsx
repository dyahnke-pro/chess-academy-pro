import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { usePieceSound } from '../../hooks/usePieceSound';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { MoveResult } from '../../hooks/useChessGame';
import type { MistakePuzzle, MistakeClassification } from '../../types';

type PuzzleState = 'playing' | 'correct' | 'incorrect';

interface MistakePuzzleBoardProps {
  puzzle: MistakePuzzle;
  onComplete: (correct: boolean) => void;
}

const CLASSIFICATION_BADGE: Record<MistakeClassification, { label: string; symbol: string; color: string }> = {
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', color: 'text-yellow-500 bg-yellow-500/10' },
  mistake: { label: 'Mistake', symbol: '?', color: 'text-orange-500 bg-orange-500/10' },
  blunder: { label: 'Blunder', symbol: '??', color: 'text-red-500 bg-red-500/10' },
};

export function MistakePuzzleBoard({ puzzle, onComplete }: MistakePuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('playing');
  const [fen, setFen] = useState(puzzle.fen);
  const chessRef = useRef(new Chess(puzzle.fen));
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();

  const badge = CLASSIFICATION_BADGE[puzzle.classification];

  // Reset when puzzle changes
  useEffect(() => {
    chessRef.current = new Chess(puzzle.fen);
    setFen(puzzle.fen);
    setState('playing');
  }, [puzzle]);

  const handleMove = useCallback((moveResult: MoveResult): void => {
    if (state !== 'playing') return;

    // Sync with our chess instance
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Already applied
    }
    setFen(chessRef.current.fen());

    // Check if the move matches bestMove
    const playerUci = moveResult.from + moveResult.to + (moveResult.promotion ?? '');
    const isCorrect = playerUci === puzzle.bestMove;

    if (isCorrect) {
      setState('correct');
      playMoveSound(moveResult.san);
      playCelebration();
      onComplete(true);
    } else {
      // Undo and show answer
      chessRef.current.undo();
      setFen(chessRef.current.fen());
      setState('incorrect');
      playEncouragement();

      // Show the correct move after a brief pause
      setTimeout(() => {
        onComplete(false);
      }, 2000);
    }
  }, [state, puzzle.bestMove, onComplete, playMoveSound, playCelebration, playEncouragement]);

  // Build arrows showing the correct move on incorrect state
  const arrows = state === 'incorrect' ? [
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
          <span className="text-sm font-medium">Correct! The best move was {puzzle.bestMoveSan}.</span>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-500" data-testid="puzzle-incorrect">
          <XCircle size={18} />
          <span className="text-sm font-medium">
            The best move was {puzzle.bestMoveSan}. You originally played {puzzle.playerMove.slice(0, 2)}-{puzzle.playerMove.slice(2, 4)}.
          </span>
        </div>
      )}

      {/* Puzzle info */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted">
        <span>Move {puzzle.moveNumber}</span>
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.cpLoss}cp loss</span>
      </div>
    </div>
  );
}
