import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chessboard } from 'react-chessboard';
import { RotateCcw, SkipBack, RefreshCw } from 'lucide-react';
import { useChessGame } from '../../hooks/useChessGame';
import { usePieceSound } from '../../hooks/usePieceSound';
import { useSettings } from '../../hooks/useSettings';
import { getBoardColor } from '../../services/boardColorService';
import { buildPieceRenderer } from '../../services/pieceSetService';
import { EvalBar } from './EvalBar';
import { VoiceChatMic } from './VoiceChatMic';
import type { EngineSnapshot, LastMoveContext } from './VoiceChatMic';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { MoveResult } from '../../hooks/useChessGame';
import { GhostPieceOverlay } from './GhostPieceOverlay';
import type {
  PieceDropHandlerArgs,
  SquareHandlerArgs,
  PieceHandlerArgs,
} from 'react-chessboard';
import type { GhostMoveData } from '../../types';

export type MoveQuality = 'good' | 'inaccuracy' | 'blunder' | null;

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
  /** External square highlights (e.g. computer's last move) — shown as yellow background */
  highlightSquares?: { from: string; to: string } | null;
  /** Whether to show last-move highlights. Defaults to true. */
  showLastMoveHighlight?: boolean;
  /** Flash the board border with a quality color (green/amber/red). Resets after animation. */
  moveQualityFlash?: MoveQuality;
  /** Arrows to draw on the board (e.g. best-move indicators). */
  arrows?: Array<{ startSquare: string; endSquare: string; color: string }>;
  /** Annotation square highlights from coach chat (colored square backgrounds). */
  annotationHighlights?: Array<{ square: string; color: string }>;
  /** Ghost piece overlay data for hint system level 3. */
  ghostMove?: GhostMoveData | null;
  /** Classification icon overlay on a square (Chess.com-style badge). */
  classificationOverlay?: { square: string; symbol: string; color: string } | null;
  /** Show the voice-chat microphone button below the board. Defaults to true. */
  showVoiceMic?: boolean;
  /** PGN string passed to voice chat for context. */
  pgnForChat?: string;
  /** Called when the user asks the coach to play a specific opening via voice. */
  onOpeningRequest?: (openingName: string) => void;
  /** Pre-computed engine snapshot passed to voice chat (avoids re-running Stockfish). */
  voiceEngineSnapshot?: EngineSnapshot | null;
  /** Context about the last move played, for voice chat move quality questions. */
  voiceLastMoveContext?: LastMoveContext | null;
  /** Which color the student is playing, for voice chat context. */
  voicePlayerColor?: 'white' | 'black';
  /** Called when voice mic listening/streaming state changes. */
  onVoiceActiveChange?: (active: boolean) => void;
  /** Called when the voice chat LLM response includes arrow annotations. */
  onVoiceArrows?: (arrows: Array<{ startSquare: string; endSquare: string; color: string }>) => void;
}

const FLASH_COLORS: Record<string, string> = {
  good: 'rgba(34, 197, 94, 0.6)',       // green-500
  inaccuracy: 'rgba(245, 158, 11, 0.6)', // amber-500
  blunder: 'rgba(239, 68, 68, 0.6)',     // red-500
};

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
  highlightSquares = null,
  showLastMoveHighlight = true,
  moveQualityFlash = null,
  arrows,
  annotationHighlights,
  ghostMove,
  classificationOverlay = null,
  showVoiceMic = true,
  pgnForChat,
  onOpeningRequest,
  voiceEngineSnapshot,
  voiceLastMoveContext,
  voicePlayerColor,
  onVoiceActiveChange,
  onVoiceArrows,
}: ChessBoardProps): JSX.Element {
  const game = useChessGame(initialFen, initialOrientation, computerColor);
  const { playMoveSound } = usePieceSound();
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  // ─── Board color + piece set from settings ────────────────────────────────
  const boardColorScheme = useMemo(() => getBoardColor(settings.boardColor), [settings.boardColor]);
  const pieceFilters = useMemo(() => ({
    whitePieceFilter: boardColorScheme.whitePieceFilter,
    blackPieceFilter: boardColorScheme.blackPieceFilter,
  }), [boardColorScheme]);
  const customPieces = useMemo(
    () => buildPieceRenderer(settings.pieceSet, pieceFilters),
    [settings.pieceSet, pieceFilters],
  );

  // ─── Board border flash ─────────────────────────────────────────────────────
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (!moveQualityFlash) {
      setFlashColor(null);
      return;
    }
    setFlashColor(FLASH_COLORS[moveQualityFlash] ?? null);
    const timer = setTimeout(() => setFlashColor(null), 500);
    return () => clearTimeout(timer);
  }, [moveQualityFlash]);

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
      styles[sq] = { boxShadow: 'inset 0 0 8px 2px rgba(0, 229, 255, 0.08)' };
    }

    // Last-move highlight (internal or external)
    if (showLastMoveHighlight) {
      const moveHighlight = lastMove ?? highlightSquares;
      if (moveHighlight) {
        styles[moveHighlight.from] = { background: 'rgba(0, 229, 255, 0.2)' };
        styles[moveHighlight.to] = { background: 'rgba(0, 229, 255, 0.25)' };
      }
    }

    // Coach annotation highlights — inner border so pieces remain visible
    if (annotationHighlights) {
      for (const h of annotationHighlights) {
        styles[h.square] = {
          ...styles[h.square],
          boxShadow: `inset 0 0 0 3px ${h.color}`,
        };
      }
    }

    // King in check — red radial glow
    if (checkSquare) {
      styles[checkSquare] = {
        background:
          'radial-gradient(circle, rgba(255,48,48,0.85) 40%, rgba(255,48,48,0.3) 100%)',
      };
    }

    // Selected square — cyan glow
    if (selectedSquare) {
      styles[selectedSquare] = { background: 'rgba(0, 229, 255, 0.35)', boxShadow: 'inset 0 0 8px rgba(0, 229, 255, 0.4)' };
    }

    // Legal move targets — cyan dot (empty) or capture ring (occupied)
    for (const sq of legalMoves) {
      const hasPiece = getPiece(sq);
      if (hasPiece) {
        styles[sq] = {
          background:
            'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0, 229, 255, 0.3) 60%, rgba(0, 229, 255, 0.3) 80%, rgba(0,0,0,0) 80%)',
          cursor: 'pointer',
        };
      } else {
        styles[sq] = {
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.3) 25%, transparent 25%)',
          cursor: 'pointer',
        };
      }
    }

    return styles;
  }, [lastMove, highlightSquares, checkSquare, selectedSquare, legalMoves, getPiece, showLastMoveHighlight, annotationHighlights]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasControls = showFlipButton || showUndoButton || showResetButton || showVoiceMic;

  return (
    <div
      className={`flex flex-col ${className}`}
      data-testid="chess-board-container"
    >
      {/* Mobile: horizontal eval bar above the board */}
      {showEvalBar && isMobile && (
        <EvalBar
          evaluation={evaluation}
          isMate={isMate}
          mateIn={mateIn}
          horizontal
        />
      )}

      {/* Board row: eval bar (desktop only) + board */}
      <div className="relative flex items-stretch gap-1">
        {/* Evaluation bar — left side (desktop only) */}
        {showEvalBar && !isMobile && (
          <EvalBar
            evaluation={evaluation}
            isMate={isMate}
            mateIn={mateIn}
            className="self-stretch"
          />
        )}

        {/* Board */}
        <div
          className="relative flex-1"
          data-testid="board-wrapper"
          style={boardColorScheme.borderGlow
            ? { boxShadow: boardColorScheme.borderGlow, borderRadius: '4px' }
            : undefined
          }
        >
          <Chessboard
            options={{
              position: game.position,
              boardOrientation: game.boardOrientation,
              squareStyles: customSquareStyles,
              darkSquareStyle: { backgroundColor: boardColorScheme.darkSquare },
              lightSquareStyle: { backgroundColor: boardColorScheme.lightSquare },
              ...(customPieces ? { pieces: customPieces } : {}),
              allowDragging: interactive,
              dragActivationDistance: 5,
              animationDurationInMs: 200,
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              onPieceDrag: handlePieceDrag,
              ...(arrows && arrows.length > 0 ? { arrows, clearArrowsOnPositionChange: true } : {}),
            }}
          />
          {/* Move quality border flash */}
          {flashColor && (
            <div
              className="absolute inset-0 pointer-events-none rounded-sm animate-pulse"
              style={{ boxShadow: `inset 0 0 0 4px ${flashColor}` }}
              data-testid="move-quality-flash"
            />
          )}
          {/* Ghost piece overlay for hint level 3 */}
          {ghostMove && (
            <GhostPieceOverlay
              ghostMove={ghostMove}
              boardOrientation={game.boardOrientation}
              pieceSet={settings.pieceSet}
            />
          )}
          {/* Classification icon overlay (Chess.com-style badge) */}
          {classificationOverlay && (
            <ClassificationBadge
              square={classificationOverlay.square}
              symbol={classificationOverlay.symbol}
              color={classificationOverlay.color}
              boardOrientation={game.boardOrientation}
            />
          )}
          {/* Voice chat mic — bottom-right of the board */}
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
          {showVoiceMic && (
            <VoiceChatMic
              fen={game.position}
              pgn={pgnForChat}
              turn={game.turn}
              onOpeningRequest={onOpeningRequest}
              engineSnapshot={voiceEngineSnapshot}
              lastMoveContext={voiceLastMoveContext}
              playerColor={voicePlayerColor}
              onListeningChange={onVoiceActiveChange}
              onArrows={onVoiceArrows}
            />
          )}
        </div>
      )}

    </div>
  );
}

interface ClassificationBadgeProps {
  square: string;
  symbol: string;
  color: string;
  boardOrientation: 'white' | 'black';
}

function squareToPosition(
  square: string,
  boardOrientation: 'white' | 'black',
): { left: string; top: string } {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = parseInt(square[1], 10) - 1; // 1=0, 8=7

  const col = boardOrientation === 'white' ? file : 7 - file;
  const row = boardOrientation === 'white' ? 7 - rank : rank;

  return {
    left: `${(col + 0.5) * 12.5}%`,
    top: `${(row + 0.1) * 12.5}%`,
  };
}

const ClassificationBadge = memo(function ClassificationBadge({
  square,
  symbol,
  color,
  boardOrientation,
}: ClassificationBadgeProps): JSX.Element {
  const pos = squareToPosition(square, boardOrientation);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${square}-${symbol}`}
        className="absolute pointer-events-none"
        style={{
          left: pos.left,
          top: pos.top,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        data-testid="classification-badge"
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md"
          style={{ background: color }}
        >
          {symbol}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
