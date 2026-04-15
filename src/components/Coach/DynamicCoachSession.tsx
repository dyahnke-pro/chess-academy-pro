/**
 * DynamicCoachSession
 * -------------------
 * Consistent chrome wrapper for every session launched from the coach
 * (middlegame, play-against, walkthrough, explain-position). Renders
 * full-page on both desktop and mobile so the inner view can use the
 * full viewport for the board. A small floating "coach" pill at the
 * top-right links back to chat — the inner view typically also shows
 * an in-lesson back button in its header.
 *
 * The wrapper is deliberately thin: child views own their own
 * `ChessLessonLayout` instance so the board / controls / header
 * arrangement stays consistent across lesson types. This component
 * only contributes a subtle session indicator so the user always
 * knows they're in a coach-initiated flow.
 */
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export interface DynamicCoachSessionProps {
  /** Short title shown in the floating pill (e.g. "Middlegame plan"). */
  title: string;
  /** Navigates back to the coach chat. */
  onExit: () => void;
  children: ReactNode;
}

export function DynamicCoachSession({
  title,
  onExit,
  children,
}: DynamicCoachSessionProps): JSX.Element {
  return (
    <div
      className="relative flex flex-col h-full w-full"
      data-testid="dynamic-coach-session"
    >
      {/* Floating coach-session indicator. Positioned so it doesn't
          overlap the ChessLessonLayout header on wide viewports but
          stays out of the way on mobile where the header has its own
          back button. */}
      <button
        onClick={onExit}
        className="hidden md:flex absolute top-3 right-3 z-10 items-center gap-2 px-3 py-1.5 rounded-full bg-theme-surface/90 backdrop-blur border border-theme-border text-xs text-theme-text-muted hover:text-theme-text hover:bg-theme-surface"
        aria-label="Back to coach chat"
        data-testid="dynamic-coach-session-exit"
      >
        <span
          className="w-5 h-5 rounded-full bg-theme-accent text-white flex items-center justify-center text-[10px] font-bold"
          aria-hidden
        >
          C
        </span>
        <span className="truncate max-w-[180px]">{title}</span>
        <ArrowLeft size={12} />
      </button>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
