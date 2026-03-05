import { useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, SkipBack, RefreshCw } from 'lucide-react';
import { useChessGame } from '../../hooks/useChessGame';
import { usePieceSound } from '../../hooks/usePieceSound';
import { EvalBar } from './EvalBar';
import type { MoveResult } from '../../hooks/useChessGame';
import type {
  PieceDropHandlerArgs,
  SquareHandlerArgs,
  PieceHandlerArgs,
} from 'react-chessboard';

export interface ChessBoardProps {
  initialFen?: string;
  /** Initial board orientation — applied once on mount. */
  orientation?: 'white' | 'black';
  interactive?: boolean;
  showFlipButton?: boolean;
  showUndoButton?: boolean;
  showResetButton?: boolean;
  /** Show the Stockfish evaluation bar. Requires evaluation prop to be meaningful. */
  showEvalBar?: boolean;
  /** Evaluation in centipawns (positive = white winning). Provided by WO-11 Stockfish. */
  evaluation?: number | null;
  isMate?: boolean;
  mateIn?: number | null;
  onMove?: (move: MoveResult) => void;
  onUndo?: () => void;
  onReset?: () => void;
  className?: string;
  /** Color controlled by the computer ('w' | 'b'). When set, that side moves automatically. */
  computerColor?: 'w' | 'b';
}

export function ChessBoard({
  initialFen,
  orientation: initialOrientation = 'white',
  interactive = true,
  showFlipButton = true,
  showUndoButton = false,
  showResetButton = false,
  showEvalBar = false,
  evaluation = null,
  isMate = false,
  mateIn = null,
  onMove,
  onUndo,
  onReset,
  className = '',
  computerColor,
}: ChessBoardProps): JSX.Element {
  const game = useChessGame(initialFen, initialOrientation, computerColor);
  const { playMoveSound } = usePieceSound();

  // ─── Move handlers ───────────────────────────────────────────────────────────

  // react-chessboard v5 passes an object, not positional args
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!interactive || !targetSquare) {
        game.clearSelection();
        return false;
      }
      const result = game.onDrop(sourceSquare, targetSquare);
      if (result) {
        onMove?.(result);
        playMoveSound(result.san);
      } else {
        game.clearSelection();
      }
      return result !== null;
    },
    [interactive, game, onMove, playMoveSound],
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs): void => {
      if (!interactive) return;
      const result = game.onSquareClick(square);
      if (result) {
        onMove?.(result);
        playMoveSound(result.san);
      }
    },
    [interactive, game, onMove, playMoveSound],
  );

  // On drag begin: select the source square to show legal move hints.
  const handlePieceDrag = useCallback(
    ({ square }: PieceHandlerArgs): void => {
      if (!interactive || !square) return;
      game.onSquareClick(square);
    },
    [interactive, game],
  );

  const handleUndo = useCallback((): void => {
    game.undoMove();
    onUndo?.();
  }, [game, onUndo]);

  const handleReset = useCallback((): void => {
    game.resetGame();
    onReset?.();
  }, [game, onReset]);

  // ─── Square highlight styles ─────────────────────────────────────────────────

  const { lastMove, checkSquare, selectedSquare, legalMoves, getPiece } = game;

  const customSquareStyles = useMemo((): Record<string, React.CSSProperties> => {
    const styles: Record<string, React.CSSProperties> = {};

    // Center squares — subtle persistent highlight (lowest priority, overridden by everything else)
    const centerSquares = ['e4', 'd4', 'e5', 'd5'];
    for (const sq of centerSquares) {
      styles[sq] = { boxShadow: 'inset 0 0 8px 2px rgba(255, 215, 0, 0.15)' };
    }

    // Last-move yellow highlight
    if (lastMove) {
      styles[lastMove.from] = { background: 'rgba(255, 255, 0, 0.4)' };
      styles[lastMove.to] = { background: 'rgba(255, 255, 0, 0.4)' };
    }

    // King in check — red radial glow
    if (checkSquare) {
      styles[checkSquare] = {
        background:
          'radial-gradient(circle, rgba(255,48,48,0.85) 40%, rgba(255,48,48,0.3) 100%)',
      };
    }

    // Selected square — bright yellow
    if (selectedSquare) {
      styles[selectedSquare] = { background: 'rgba(255, 255, 0, 0.65)' };
    }

    // Legal move targets — green dot (empty) or capture ring (occupied)
    for (const sq of legalMoves) {
      const hasPiece = getPiece(sq);
      if (hasPiece) {
        styles[sq] = {
          background:
            'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.18) 80%, rgba(0,0,0,0) 80%)',
          cursor: 'pointer',
        };
      } else {
        styles[sq] = {
          background: 'radial-gradient(circle, rgba(0,0,0,0.18) 25%, transparent 25%)',
          cursor: 'pointer',
        };
      }
    }

    return styles;
  }, [lastMove, checkSquare, selectedSquare, legalMoves, getPiece]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasControls = showFlipButton || showUndoButton || showResetButton;

  return (
    <div
      className={`flex flex-col ${className}`}
      data-testid="chess-board-container"
    >
      {/* Board row: eval bar + board */}
      <div className="relative flex items-stretch gap-1">
        {/* Evaluation bar — left side */}
        {showEvalBar && (
          <EvalBar
            evaluation={evaluation}
            isMate={isMate}
            mateIn={mateIn}
            className="self-stretch"
            data-testid="eval-bar-wrapper"
          />
        )}

        {/* Board */}
        <div className="relative flex-1" data-testid="board-wrapper">
          <Chessboard
            options={{
              position: game.position,
              boardOrientation: game.boardOrientation,
              squareStyles: customSquareStyles,
              allowDragging: interactive,
              dragActivationDistance: 5,
              animationDurationInMs: 200,
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              onPieceDrag: handlePieceDrag,
            }}
          />
        </div>
      </div>

      {/* Control buttons — below the board */}
      {hasControls && (
        <div className="flex justify-center gap-2 mt-2" data-testid="board-controls">
          {showResetButton && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
              title="New game"
              aria-label="New game"
              data-testid="reset-button"
            >
              <RefreshCw size={14} />
              <span>Reset</span>
            </button>
          )}
          {showUndoButton && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
              title="Undo last move"
              aria-label="Undo last move"
              data-testid="undo-button"
            >
              <SkipBack size={14} />
              <span>Undo</span>
            </button>
          )}
          {showFlipButton && (
            <button
              onClick={game.flipBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text text-sm transition-colors"
              title="Flip board"
              aria-label="Flip board"
              data-testid="flip-button"
            >
              <RotateCcw size={14} />
              <span>Flip</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
