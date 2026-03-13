import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../Board/ChessBoard';
import { HintButton } from '../Coach/HintButton';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { useHintSystem } from '../../hooks/useHintSystem';
import { speechService } from '../../services/speechService';
import { CheckCircle, XCircle } from 'lucide-react';
import type { MoveResult } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { PuzzleRecord } from '../../types';

type PuzzleState = 'loading' | 'playing' | 'correct' | 'incorrect';

interface PuzzleBoardProps {
  puzzle: PuzzleRecord;
  onComplete: (correct: boolean) => void;
  disabled?: boolean;
}

function parseUciMoves(uci: string): { from: string; to: string; promotion?: string }[] {
  return uci.trim().split(/\s+/).map((m) => ({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: m.length > 4 ? m.slice(4) : undefined,
  }));
}

export function PuzzleBoard({ puzzle, onComplete, disabled = false }: PuzzleBoardProps): JSX.Element {
  const [state, setState] = useState<PuzzleState>('loading');
  const [moveIndex, setMoveIndex] = useState(0);
  const [fen, setFen] = useState(puzzle.fen);
  const chessRef = useRef(new Chess(puzzle.fen));
  const movesRef = useRef(parseUciMoves(puzzle.moves));
  const { playMoveSound, playCelebration, playEncouragement } = usePieceSound();
  const { settings } = useSettings();

  // Determine which color the user plays (opposite of who moves first in the FEN)
  const fenTurn = puzzle.fen.split(' ')[1];
  const userColor: 'white' | 'black' = fenTurn === 'w' ? 'black' : 'white';

  // Publish board context for global coach drawer
  useBoardContext(fen, '', 0, userColor, fen.split(' ')[1] === 'b' ? 'b' : 'w');

  // Derive the expected move for the hint system
  const knownMove = useMemo((): { from: string; to: string; san: string } | null => {
    if (state !== 'playing') return null;
    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return null;
    const expected = allMoves[moveIndex];

    // Get the SAN for the expected move
    try {
      const chess = new Chess(fen);
      const result = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      chess.undo();
      return { from: expected.from, to: expected.to, san: result.san };
    } catch {
      return { from: expected.from, to: expected.to, san: '' };
    }
  }, [state, moveIndex, fen]);

  // Hint system
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen,
    playerColor: userColor,
    enabled: settings.showHints && state === 'playing',
    knownMove,
    puzzleThemes: puzzle.themes,
  });

  // Reset state when puzzle changes
  useEffect(() => {
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    movesRef.current = parseUciMoves(puzzle.moves);
    setMoveIndex(0);
    setFen(puzzle.fen);
    setState('loading');
    resetHints();

    // Auto-play the first move (opponent sets up the puzzle)
    const timer = setTimeout(() => {
      const moves = movesRef.current;
      const firstMove = moves.length > 0 ? moves[0] : undefined;
      if (firstMove) {
        try {
          const result = chess.move({ from: firstMove.from, to: firstMove.to, promotion: firstMove.promotion });
          playMoveSound(result.san);
          setFen(chess.fen());
        } catch {
          // Invalid move in puzzle data - skip
        }
      }
      setMoveIndex(1);
      setState('playing');
    }, 600);

    return () => clearTimeout(timer);
  }, [puzzle, playMoveSound, resetHints]);

  const handleMove = useCallback((move: MoveResult): void => {
    if (state !== 'playing' || disabled) return;

    const allMoves = movesRef.current;
    if (moveIndex >= allMoves.length) return;
    const expected = allMoves[moveIndex];

    const isCorrect = move.from === expected.from && move.to === expected.to;

    if (isCorrect) {
      playMoveSound(move.san);
      resetHints();
      const nextIndex = moveIndex + 1;

      // Check if puzzle is fully solved
      if (nextIndex >= movesRef.current.length) {
        setState('correct');
        playCelebration();
        speechService.speak(getThemeComment(puzzle.themes));
        onComplete(true);
        return;
      }

      // Auto-play opponent's response
      if (nextIndex < allMoves.length) {
        const opponentMove = allMoves[nextIndex];
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
            // skip
          }
          setMoveIndex(nextIndex + 1);
        }, 400);
      }
    } else {
      // Wrong move — undo it from chess.js state and show feedback
      chessRef.current.undo();
      setFen(chessRef.current.fen());
      setState('incorrect');
      playEncouragement();
      speechService.speak('Not quite. Try to find the best move.');

      // Allow retry after brief pause
      setTimeout(() => {
        setState('playing');
      }, 1500);
    }
  }, [state, disabled, moveIndex, puzzle.themes, onComplete, playMoveSound, playCelebration, playEncouragement, resetHints]);

  const handleChessBoardMove = useCallback((moveResult: MoveResult): void => {
    // ChessBoard's internal chess.js has already applied the move.
    // We need to sync our ref and then validate.
    // Since ChessBoard uses its own chess instance, we apply the same move to ours.
    try {
      chessRef.current.move({ from: moveResult.from, to: moveResult.to, promotion: moveResult.promotion });
    } catch {
      // Move already applied or invalid — ignore
    }
    setFen(chessRef.current.fen());
    handleMove(moveResult);
  }, [handleMove]);

  return (
    <div className="space-y-3" data-testid="puzzle-board">
      <div className="max-w-md mx-auto">
        <ChessBoard
          initialFen={fen}
          key={fen}
          orientation={userColor}
          interactive={state === 'playing' && !disabled}
          showFlipButton
          showUndoButton={false}
          showResetButton={false}
          onMove={handleChessBoardMove}
          arrows={hintState.arrows.length > 0 ? hintState.arrows : undefined}
          ghostMove={hintState.ghostMove}
        />
      </div>

      {/* Hint controls */}
      {state === 'playing' && settings.showHints && (
        <div className="flex flex-col items-start gap-2" data-testid="puzzle-hint-area">
          <HintButton
            currentLevel={hintState.level}
            onRequestHint={requestHint}
            disabled={hintState.isAnalyzing}
          />
          {hintState.nudgeText && (
            <p className="text-xs text-amber-500 max-w-sm" data-testid="hint-nudge">
              {hintState.nudgeText}
            </p>
          )}
        </div>
      )}

      {/* Status message */}
      {state === 'correct' && (
        <div className="flex items-center gap-2 text-green-500" data-testid="puzzle-correct">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">Correct!</span>
        </div>
      )}
      {state === 'incorrect' && (
        <div className="flex items-center gap-2 text-red-500" data-testid="puzzle-incorrect">
          <XCircle size={18} />
          <span className="text-sm font-medium">Incorrect — try again</span>
        </div>
      )}
      {state === 'loading' && (
        <div className="text-sm text-theme-text-muted" data-testid="puzzle-loading">
          Setting up puzzle...
        </div>
      )}

      {/* Puzzle info */}
      <div className="flex items-center gap-3 text-xs text-theme-text-muted">
        <span>Rating: {puzzle.rating}</span>
        <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
        <span>{puzzle.themes.slice(0, 3).join(', ')}</span>
      </div>
    </div>
  );
}

function getThemeComment(themes: string[]): string {
  if (themes.includes('fork')) return 'Nice fork! You attacked two pieces at once.';
  if (themes.includes('pin')) return 'Great pin! The piece is stuck defending.';
  if (themes.includes('skewer')) return 'Clean skewer! Attacking through the more valuable piece.';
  if (themes.includes('backRankMate')) return 'Back rank mate! Always watch the back rank.';
  if (themes.includes('sacrifice')) return 'Beautiful sacrifice! Material for initiative.';
  if (themes.includes('mateIn1') || themes.includes('mateIn2')) return 'Checkmate! Sharp calculation.';
  if (themes.includes('endgame')) return 'Endgame technique on point!';
  if (themes.includes('discoveredAttack')) return 'Discovered attack! Unleashing the hidden piece.';
  if (themes.includes('deflection')) return 'Perfect deflection! Overloaded defender.';
  if (themes.includes('zugzwang')) return 'Zugzwang! Every move makes it worse.';
  return 'Well solved! On to the next one.';
}
