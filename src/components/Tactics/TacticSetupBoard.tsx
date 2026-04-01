import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs } from 'react-chessboard';
import { motion } from 'framer-motion';
import { tacticTypeLabel } from '../../services/tacticalProfileService';
import type { SetupPuzzle } from '../../types';

type BoardState = 'thinking' | 'correct' | 'incorrect' | 'reveal';

interface TacticSetupBoardProps {
  puzzle: SetupPuzzle;
  onComplete: (correct: boolean) => void;
}

function parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

export function TacticSetupBoard({ puzzle, onComplete }: TacticSetupBoardProps): JSX.Element {
  const [chess] = useState(() => new Chess(puzzle.setupFen));
  const [fen, setFen] = useState(puzzle.setupFen);
  const [boardState, setBoardState] = useState<BoardState>('thinking');
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('Find the preparatory move');
  const [revealStep, setRevealStep] = useState(0);
  const hasCompleted = useRef(false);

  const solutionMoves = puzzle.solutionMoves.split(' ').filter(Boolean);
  const tacticMoves = puzzle.tacticMoves.split(' ').filter(Boolean);
  const isPlayerTurn = moveIndex % 2 === 0; // Player moves on even indices

  // Determine board orientation
  const orientation = puzzle.playerColor === 'black' ? 'black' : 'white';

  // Auto-play opponent responses
  useEffect(() => {
    if (boardState !== 'thinking' || isPlayerTurn || moveIndex >= solutionMoves.length) return;

    const timer = setTimeout(() => {
      const move = solutionMoves[moveIndex];
      if (!move) return;
      const parsed = parseUciMove(move);
      try {
        chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion });
        setFen(chess.fen());
        setMoveIndex((i) => i + 1);

        if (moveIndex + 1 >= solutionMoves.length) {
          // All prep moves done — show the tactic reveal
          setBoardState('reveal');
          setMessage(`Setup complete! Now watch the ${tacticTypeLabel(puzzle.tacticType).toLowerCase()}...`);
        }
      } catch {
        // Invalid move in solution — skip
        setMoveIndex((i) => i + 1);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [boardState, isPlayerTurn, moveIndex, solutionMoves, chess, puzzle.tacticType]);

  // Reveal the tactic finish move by move
  useEffect(() => {
    if (boardState !== 'reveal' || revealStep >= tacticMoves.length) {
      if (boardState === 'reveal' && revealStep >= tacticMoves.length && !hasCompleted.current) {
        hasCompleted.current = true;
        const timer = setTimeout(() => {
          setBoardState('correct');
          setMessage(`You engineered the ${tacticTypeLabel(puzzle.tacticType).toLowerCase()}!`);
          setTimeout(() => onComplete(true), 1500);
        }, 800);
        return () => clearTimeout(timer);
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      const move = tacticMoves[revealStep];
      if (!move) return;
      const parsed = parseUciMove(move);
      try {
        chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion });
        setFen(chess.fen());
        setRevealStep((s) => s + 1);
      } catch {
        setRevealStep((s) => s + 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [boardState, revealStep, tacticMoves, chess, puzzle.tacticType, onComplete]);

  const handleDrop = useCallback(({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean => {
    if (boardState !== 'thinking' || !isPlayerTurn || !targetSquare) return false;

    const expectedMove = solutionMoves[moveIndex];
    if (!expectedMove) return false;

    const expected = parseUciMove(expectedMove);
    const pieceType = piece.pieceType.toLowerCase();
    const isPawn = pieceType.endsWith('p');
    const promotion = isPawn &&
      (targetSquare[1] === '8' || targetSquare[1] === '1')
      ? 'q'
      : undefined;

    // Check if the move matches the expected solution
    if (sourceSquare === expected.from && targetSquare === expected.to) {
      try {
        chess.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: promotion ?? expected.promotion,
        });
        setFen(chess.fen());
        setMoveIndex((i) => i + 1);

        if (moveIndex + 1 >= solutionMoves.length) {
          setBoardState('reveal');
          setMessage(`Setup complete! Now watch the ${tacticTypeLabel(puzzle.tacticType).toLowerCase()}...`);
        } else {
          setMessage('Correct! Now the opponent responds...');
        }
        return true;
      } catch {
        return false;
      }
    }

    // Wrong move
    setBoardState('incorrect');
    setMessage('Not quite — that doesn\'t set up the tactic.');
    if (!hasCompleted.current) {
      hasCompleted.current = true;
      setTimeout(() => onComplete(false), 2000);
    }
    return false;
  }, [boardState, isPlayerTurn, moveIndex, solutionMoves, chess, puzzle.tacticType, onComplete]);

  const statusColor = boardState === 'correct'
    ? 'var(--color-success)'
    : boardState === 'incorrect'
      ? 'var(--color-error)'
      : boardState === 'reveal'
        ? 'var(--color-accent)'
        : 'var(--color-text-muted)';

  return (
    <div className="flex flex-col gap-3">
      {/* Status message */}
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-2 px-4 rounded-lg text-sm font-medium"
        style={{ color: statusColor, background: `color-mix(in srgb, ${statusColor} 8%, transparent)` }}
      >
        {message}
      </motion.div>

      {/* Board */}
      <div className="aspect-square max-w-md mx-auto w-full" data-testid="setup-board">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            onPieceDrop: handleDrop,
            allowDragging: boardState === 'thinking' && isPlayerTurn,
            animationDurationInMs: 300,
            darkSquareStyle: { backgroundColor: '#779952' },
            lightSquareStyle: { backgroundColor: '#edeed1' },
          }}
        />
      </div>

      {/* Move indicator */}
      <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {boardState === 'thinking' && isPlayerTurn && (
          <span>Your turn — find the prep move ({moveIndex / 2 + 1} of {Math.ceil(solutionMoves.length / 2)})</span>
        )}
        {boardState === 'thinking' && !isPlayerTurn && (
          <span>Opponent responding...</span>
        )}
        {boardState === 'reveal' && (
          <span>The tactic unfolds...</span>
        )}
      </div>
    </div>
  );
}
