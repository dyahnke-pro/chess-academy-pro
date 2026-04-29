// ConsistentChessboard — the single board facade used everywhere in the app.
//
// Two usage modes:
//   1. Controlled mode  — pass a `game` from useChessGame(); forwards to ControlledChessBoard.
//                         Use this for any interactive lesson/coach/play screen.
//   2. Static mode      — pass a `fen`, optional handlers, and optional arrows/highlights/
//                         squareStyles. Use this for inline boards that own their own
//                         chess instance (memory drills, kid games, model-game viewers).
//
// In both modes the board's piece set, square colors, glow, animation duration, and
// promotion behavior are pinned to the values from useBoardTheme(). Callers cannot
// override appearance — that is the point.

import { useMemo, type ReactNode, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type {
  PieceDropHandlerArgs,
  SquareHandlerArgs,
  PieceHandlerArgs,
} from 'react-chessboard';
import { ControlledChessBoard, type ControlledChessBoardProps } from '../Board/ControlledChessBoard';
import { useBoardTheme, BOARD_ANIMATION_MS } from '../../hooks/useBoardTheme';
import { buildGlowSquareStyles } from '../../hooks/useBoardGlow';

export type BoardArrow = { startSquare: string; endSquare: string; color: string };
export type BoardHighlight = { square: string; color: string };

interface ControlledModeProps extends ControlledChessBoardProps {
  /** Controlled mode marker — `game` is required by ControlledChessBoardProps. */
  fen?: never;
}

/** A piece-square map alternative to FEN, used by Kid games that render only a few pieces. */
export type PiecePositionMap = Record<string, { pieceType: string }>;

interface StaticModeProps {
  /** A position — either a FEN string or a piece-square map.
   *  Mutually exclusive with `game`. */
  fen: string | PiecePositionMap;
  game?: never;
  boardOrientation?: 'white' | 'black';
  /** Whether dragging is allowed. Defaults to false (static mode is usually display-only). */
  interactive?: boolean;
  arrows?: BoardArrow[];
  /** Extra per-square styles (e.g. selection, legal-move dots). Merged on top of the
   *  base glow styles so callers don't lose the consistent look. */
  squareStyles?: Record<string, CSSProperties>;
  onPieceDrop?: (args: PieceDropHandlerArgs) => boolean;
  onSquareClick?: (args: SquareHandlerArgs) => void;
  onPieceDrag?: (args: PieceHandlerArgs) => void;
  /** Override the default animation duration (e.g. 400ms for slow demo boards). */
  animationDurationInMs?: number;
  className?: string;
  /** Content rendered on top of the board (flash overlays, hint badges, etc.). */
  overlay?: ReactNode;
}

export type ConsistentChessboardProps = ControlledModeProps | StaticModeProps;

function isControlled(props: ConsistentChessboardProps): props is ControlledModeProps {
  return 'game' in props && props.game !== undefined;
}

export function ConsistentChessboard(props: ConsistentChessboardProps): JSX.Element {
  if (isControlled(props)) {
    return <ControlledChessBoard {...props} />;
  }
  return <StaticBoard {...props} />;
}

function StaticBoard({
  fen: position,
  boardOrientation = 'white',
  interactive = false,
  arrows,
  squareStyles,
  onPieceDrop,
  onSquareClick,
  onPieceDrag,
  animationDurationInMs = BOARD_ANIMATION_MS,
  className = '',
  overlay,
}: StaticModeProps): JSX.Element {
  const theme = useBoardTheme();

  // Always start with the base glow styles so every square has the same outline,
  // then layer caller styles on top.
  const mergedSquareStyles = useMemo((): Record<string, CSSProperties> => {
    const base = buildGlowSquareStyles(theme.baseGlow);
    if (!squareStyles) return base;
    const out = { ...base };
    for (const [square, style] of Object.entries(squareStyles)) {
      out[square] = { ...base[square], ...style };
    }
    return out;
  }, [theme.baseGlow, squareStyles]);

  return (
    <div
      className={`relative ${className}`}
      data-testid="consistent-chessboard-static"
      style={theme.borderWrapperStyle}
    >
      <Chessboard
        options={{
          position,
          boardOrientation,
          allowDragging: interactive,
          dragActivationDistance: 5,
          animationDurationInMs,
          darkSquareStyle: theme.darkSquareStyle,
          lightSquareStyle: theme.lightSquareStyle,
          squareStyles: mergedSquareStyles,
          ...(theme.customPieces ? { pieces: theme.customPieces } : {}),
          ...(arrows !== undefined
            ? { arrows, clearArrowsOnPositionChange: true }
            : {}),
          ...(onPieceDrop ? { onPieceDrop } : {}),
          ...(onSquareClick ? { onSquareClick } : {}),
          ...(onPieceDrag ? { onPieceDrag } : {}),
        }}
      />
      {overlay}
    </div>
  );
}
