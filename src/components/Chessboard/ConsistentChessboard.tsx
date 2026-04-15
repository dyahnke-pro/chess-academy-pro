/**
 * ConsistentChessboard
 * ---------------------
 * The single board wrapper used across all lesson-style surfaces
 * (Openings walkthrough, Coach sessions, Middlegame plans, Tactics).
 *
 * It wraps the existing `ControlledChessBoard` but presents a narrow
 * lesson-focused API and enforces a consistent visual look-and-feel
 * (piece style, colors, arrow colors, animation timing) by delegating
 * to the underlying board (which already reads theme + settings).
 *
 * Variations should be expressed through small props (`interactive`,
 * `showArrows`, `orientation`, `maxWidth`). The core look stays
 * identical.
 *
 * See CLAUDE.md → "Agent Coach Pattern" for usage guidance.
 */
import { useEffect, useMemo } from 'react';
import { ControlledChessBoard } from '../Board/ControlledChessBoard';
import { useChessGame } from '../../hooks/useChessGame';
import type { MoveResult } from '../../hooks/useChessGame';

export interface LessonArrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

export interface LessonHighlight {
  square: string;
  color: string;
}

export interface ConsistentChessboardProps {
  /** Current position — updating this replays the board to that FEN. */
  fen: string;
  /** Board orientation from the student's perspective. */
  orientation?: 'white' | 'black';
  /** Can the student move pieces? */
  interactive?: boolean;
  /** Arrows for coaching hints. Ignored when showArrows=false. */
  arrows?: LessonArrow[];
  /** Square highlights for coaching hints. */
  highlights?: LessonHighlight[];
  /** Override: hide arrows even if `arrows` is non-empty. */
  showArrows?: boolean;
  /** Max board width in CSS units. Default: fill available. */
  maxWidth?: string;
  /** Called after a user-made move is accepted. */
  onMove?: (move: MoveResult) => void;
  /** Optional className passed to the outer container. */
  className?: string;
  /** Optional data-testid passthrough. */
  testId?: string;
}

/**
 * Drives the underlying `useChessGame` hook to stay in sync with the
 * `fen` prop — when the parent sets a new FEN (e.g. lesson next-step),
 * we load it into the game instance.
 */
export function ConsistentChessboard({
  fen,
  orientation = 'white',
  interactive = false,
  arrows,
  highlights,
  showArrows = true,
  maxWidth,
  onMove,
  className = '',
  testId,
}: ConsistentChessboardProps): JSX.Element {
  const game = useChessGame(fen, orientation);

  // Keep the game instance in sync with the incoming fen prop.
  // Parent-driven position changes (e.g. stepping through a lesson) must
  // be reflected on the board.
  useEffect(() => {
    if (game.position !== fen) {
      game.loadFen(fen);
    }
    // game.loadFen identity is stable across renders (exposed by useChessGame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  useEffect(() => {
    if (game.boardOrientation !== orientation) {
      game.setOrientation(orientation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

  const arrowsToShow = useMemo(
    () => (showArrows ? arrows : undefined),
    [showArrows, arrows],
  );

  const style = maxWidth ? { maxWidth, margin: '0 auto' } : undefined;

  return (
    <div
      className={`consistent-chessboard w-full ${className}`}
      style={style}
      data-testid={testId ?? 'consistent-chessboard'}
    >
      <ControlledChessBoard
        game={game}
        interactive={interactive}
        showFlipButton={false}
        showUndoButton={false}
        showResetButton={false}
        showEvalBar={false}
        showVoiceMic={false}
        showLastMoveHighlight={true}
        arrows={arrowsToShow}
        annotationHighlights={highlights}
        onMove={onMove}
      />
    </div>
  );
}
