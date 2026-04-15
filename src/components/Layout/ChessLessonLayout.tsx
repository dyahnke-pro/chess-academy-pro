/**
 * ChessLessonLayout
 * -----------------
 * Wrapper for any "board + controls" lesson screen.
 *
 * Enforces:
 * - Generous, fixed spacing between the board and the control row.
 * - Controls sit in the mobile thumb zone, above the bottom nav,
 *   respecting `env(safe-area-inset-bottom)`.
 * - The board height is capped so the controls are always reachable
 *   without scrolling. Longer explanations scroll inside the header
 *   slot, never pushing controls off-screen.
 *
 * Use it anywhere a lesson runs: Openings walkthrough, Coach session,
 * Middlegame plans, play-against-Stockfish. See CLAUDE.md →
 * "Agent Coach Pattern".
 */
import type { ReactNode } from 'react';

export interface ChessLessonLayoutProps {
  /** Optional header slot — title, progress, explanation. Scrolls if long. */
  header?: ReactNode;
  /** The board element (typically a <ConsistentChessboard />). Required. */
  board: ReactNode;
  /** Control buttons row — Next, Prev, Flip, Ask, Voice toggle, etc. */
  controls?: ReactNode;
  /** Optional footer slot rendered below controls (e.g. narration caption). */
  footer?: ReactNode;
  /** Optional className passed to the outer container. */
  className?: string;
  /** Optional data-testid. Defaults to "chess-lesson-layout". */
  testId?: string;
}

export function ChessLessonLayout({
  header,
  board,
  controls,
  footer,
  className = '',
  testId = 'chess-lesson-layout',
}: ChessLessonLayoutProps): JSX.Element {
  return (
    <div
      className={`chess-lesson-layout flex flex-col h-full w-full overflow-hidden ${className}`}
      data-testid={testId}
      style={{
        // Respect the iOS safe area at the bottom so the controls row
        // never sits under the home indicator.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {header && (
        <div
          className="flex-shrink-0 overflow-y-auto px-4 pt-3"
          data-testid="lesson-header"
          style={{ maxHeight: '30vh' }}
        >
          {header}
        </div>
      )}

      {/* Board: flex-1 but capped so controls never slide off-screen.
          The max-height ensures we always leave room for controls +
          footer + bottom nav below. */}
      <div
        className="flex items-center justify-center px-3 py-4 flex-1 min-h-0"
        data-testid="lesson-board-slot"
      >
        <div
          className="w-full"
          style={{
            // Cap the board at a square that fits within the viewport
            // minus room for controls (~96px), footer (~48px), the
            // bottom nav (~64px), and safe-area insets.
            maxWidth: 'min(100%, calc(100dvh - 280px))',
          }}
        >
          {board}
        </div>
      </div>

      {/* Generous gap between board and controls — thumb-friendly zone. */}
      {controls && (
        <div
          className="flex-shrink-0 flex items-center justify-center gap-3 px-4 pt-2 pb-3"
          data-testid="lesson-controls"
          // Sit comfortably above the bottom tab bar (~64px) on mobile.
          style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
        >
          {controls}
        </div>
      )}

      {footer && (
        <div
          className="flex-shrink-0 px-4 pb-2"
          data-testid="lesson-footer"
        >
          {footer}
        </div>
      )}
    </div>
  );
}
