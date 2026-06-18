import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, MessageCircle, X } from 'lucide-react';
import { GameChatPanel } from '../Coach/GameChatPanel';
import { useIsMobile } from '../../hooks/useIsMobile';

/**
 * LessonScaffold — the ONE shared chrome for every Watch/Learn surface on the
 * opening detail page (David 2026-05-29: "make the UI look the same in every
 * tab. The standard is the opening tab.").
 *
 * It owns the layout the Watch & Learn standard established:
 *   • header     — back arrow + title + subtitle (+ optional right action)
 *   • progress   — "Move X / Y" label + animated accent bar
 *   • board      — caller-supplied (always a ConsistentChessboard)
 *   • boardExtra — optional row under the board (move label, explore eval)
 *   • narration  — the written narration card (visible text, never voice-only)
 *   • controls   — prev / play-pause / next row (forward & back, everywhere)
 *   • footer     — optional CTAs under the controls (Continue, etc.)
 *
 * Players that need bespoke controls (model-game first/last + explore, the
 * memory-phase Hint, etc.) pass `controlsLeading` / `controlsTrailing` or a
 * fully `customControls` node; the visual frame stays identical regardless.
 */

export type ProgressTone = 'accent' | 'green';
export type NarrationTone = 'default' | 'warning' | 'success' | 'accent';

/**
 * Grounding context for the inline coach chat (David 2026-06-18: "add a chat
 * function to all WLPP pages … use the same structure as Learn / Play with
 * Coach"). The caller passes its CURRENT displayed position; the scaffold
 * derives turn / move number and mounts the SAME `GameChatPanel` that
 * `/coach/teach` + `/coach/play` use — Q&A grounded on the live board (no
 * move-mutation handlers, so the lesson board is never hijacked). */
export interface LessonChatContext {
  /** The position currently shown on the board (FEN). */
  fen: string;
  /** Full PGN / move text for grounding. Falls back to `history.join(' ')`. */
  pgn?: string;
  /** SAN move history up to the current position. */
  history?: string[];
  /** The side the student plays / board orientation. Defaults to 'white'. */
  playerColor?: 'white' | 'black';
}

interface LessonScaffoldControls {
  onPrev?: () => void;
  onNext?: () => void;
  onTogglePlay?: () => void;
  isPlaying?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
  /** Label spoken to screen readers on the play/pause toggle. */
  playLabel?: string;
  pauseLabel?: string;
  /** Override the play/pause button's test id (back-compat with existing
   *  audits/tests, e.g. 'demo-play-pause'). */
  playTestId?: string;
  /** Extra controls rendered before / after the core prev-play-next group. */
  leading?: ReactNode;
  trailing?: ReactNode;
}

interface LessonScaffoldProps {
  title: string;
  subtitle?: string;
  onExit: () => void;
  /** Right-aligned header action (Practice skip, Watch Again, flip, etc.). */
  headerAction?: ReactNode;
  /** When set, renders the "X / Y" label + animated progress bar. */
  progress?: { current: number; total: number; tone?: ProgressTone; label?: string };
  /** The board element — always a ConsistentChessboard from the caller. */
  board: ReactNode;
  /** Optional content between the board and the narration card. */
  boardExtra?: ReactNode;
  /** The written narration, wrapped in the standard card. Hidden when empty. */
  narration?: ReactNode;
  narrationTone?: NarrationTone;
  /** A fully custom narration block (skips the standard card wrapper). */
  narrationRaw?: ReactNode;
  /** Default prev / play-pause / next control row. */
  controls?: LessonScaffoldControls;
  /** A fully custom control row (overrides `controls`). */
  customControls?: ReactNode;
  /** Optional CTAs under the controls. */
  footer?: ReactNode;
  /** When set, mounts the inline coach chat — a persistent right-hand column
   *  at md+ (same two-column shape as Learn/Play with Coach) and a header
   *  Chat button → bottom-sheet drawer on mobile. */
  chat?: LessonChatContext;
  /** Fired when the mobile chat drawer opens / closes, so an auto-playing
   *  lesson can pause while the student is asking a question. */
  onChatOpenChange?: (open: boolean) => void;
  testId?: string;
  /** Back-compat test-id overrides so existing tests + prod audits keep
   *  resolving the same elements after the chrome was unified. */
  backTestId?: string;
  titleTestId?: string;
  narrationTestId?: string;
}

const NARRATION_TONE_CLASS: Record<NarrationTone, string> = {
  default: 'bg-theme-surface/90 border border-white/15',
  warning: 'bg-red-500/10 border border-red-500/30',
  success: 'bg-green-500/10 border border-green-500/30',
  accent: 'bg-theme-accent/10 border border-theme-accent/30',
};

/** The progress bar — exported so surfaces that don't use the full scaffold
 *  (legacy WalkthroughMode, MiddlegamePlanStudy) can match it exactly. */
export function LessonProgress({
  current,
  total,
  tone = 'accent',
  label = 'Move',
}: {
  current: number;
  total: number;
  tone?: ProgressTone;
  label?: string;
}): JSX.Element {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="px-4 pt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-theme-text-muted uppercase font-medium">
          {label} {current} / {total}
        </span>
      </div>
      <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${tone === 'green' ? 'bg-green-500' : 'bg-theme-accent'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          data-testid="lesson-progress"
        />
      </div>
    </div>
  );
}

/** The shared prev / play-pause / next control row. Exported for the same
 *  reason as LessonProgress — surfaces with their own layout can drop it in. */
export function LessonControls({
  onPrev,
  onNext,
  onTogglePlay,
  isPlaying = false,
  canPrev = true,
  canNext = true,
  playLabel = 'Play',
  pauseLabel = 'Pause',
  playTestId = 'lesson-play-pause',
  leading,
  trailing,
}: LessonScaffoldControls): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-3">
      {leading}
      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="p-2.5 rounded-full bg-theme-surface text-theme-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-theme-border transition-colors"
          aria-label="Previous move"
          data-testid="lesson-prev"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {onTogglePlay && (
        <button
          type="button"
          onClick={onTogglePlay}
          className="p-3.5 rounded-full bg-theme-accent text-white shadow-lg hover:opacity-90 transition-opacity"
          aria-label={isPlaying ? pauseLabel : playLabel}
          data-testid={playTestId}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="p-2.5 rounded-full bg-theme-surface text-theme-text disabled:opacity-30 disabled:cursor-not-allowed hover:bg-theme-border transition-colors"
          aria-label="Next move"
          data-testid="lesson-next"
        >
          <ChevronRight size={22} />
        </button>
      )}
      {trailing}
    </div>
  );
}

export function LessonScaffold({
  title,
  subtitle,
  onExit,
  headerAction,
  progress,
  board,
  boardExtra,
  narration,
  narrationTone = 'default',
  narrationRaw,
  controls,
  customControls,
  footer,
  chat,
  onChatOpenChange,
  testId = 'lesson-scaffold',
  backTestId = 'lesson-back',
  titleTestId,
  narrationTestId = 'lesson-narration',
}: LessonScaffoldProps): JSX.Element {
  const hasControls = Boolean(customControls) || Boolean(controls);
  const isMobile = useIsMobile();

  const [chatOpen, setChatOpen] = useState(false);
  // When the mobile chat splits the screen, the lesson column shrinks — so the
  // narration + controls must yield room or they starve the (height-capped)
  // board to nothing (David 2026-06-18 "board got cut off").
  const chatSplit = Boolean(chat) && isMobile && chatOpen;
  const toggleChat = (): void => {
    setChatOpen((prev) => {
      const next = !prev;
      onChatOpenChange?.(next);
      return next;
    });
  };

  /** The shared chat panel — the SAME GameChatPanel /coach/teach + /coach/play
   *  mount, grounded on the lesson's current position. Q&A + arrows only (no
   *  move-mutation handlers), so the lesson board is never hijacked. */
  const chatPanel = chat ? (
    <GameChatPanel
      fen={chat.fen}
      getLiveFen={() => chat.fen}
      pgn={chat.pgn ?? (chat.history ?? []).join(' ')}
      moveNumber={chat.history?.length ?? 0}
      playerColor={chat.playerColor ?? 'white'}
      turn={chat.fen.split(' ')[1] === 'b' ? 'b' : 'w'}
      isGameOver={false}
      gameResult=""
      history={chat.history}
      hideHeader
      className="h-full"
    />
  ) : null;

  return (
    <div className="relative flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden" data-testid={testId}>
      {/* LEFT: the lesson itself. When the chat column is present it takes 3/5
          of the width at md+ (same split as Learn/Play with Coach); otherwise
          it fills the surface. */}
      <div className={`flex flex-col flex-1 min-h-0 overflow-hidden ${chat ? 'md:w-3/5 md:flex-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-theme-surface shrink-0"
            aria-label="Back"
            data-testid={backTestId}
          >
            <ArrowLeft size={16} className="text-theme-text" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-theme-text truncate" data-testid={titleTestId}>{title}</p>
            {subtitle && <p className="text-xs text-theme-text-muted truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerAction}
          {/* Inline Chat button — mobile only (desktop shows the persistent
              chat column). Opens the bottom-sheet GameChatPanel. */}
          {chat && (
            <button
              type="button"
              onClick={toggleChat}
              className={`md:hidden p-2 rounded-lg hover:bg-theme-surface ${chatOpen ? 'text-theme-accent' : 'text-theme-text-muted'}`}
              aria-label={chatOpen ? 'Close coach chat' : 'Ask the coach'}
              aria-pressed={chatOpen}
              data-testid="lesson-chat-toggle"
            >
              <MessageCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <LessonProgress
          current={progress.current}
          total={progress.total}
          tone={progress.tone}
          label={progress.label}
        />
      )}

      {/* Board — height-capped so a square board never overflows its flex
          region and paints OVER the narration card on short viewports
          (David 2026-06-18 "text behind the board"). react-chessboard sizes
          itself from its container WIDTH and renders square, so on a short
          phone a `w-full` board's height exceeds the shrunken flex region and
          spills onto the next sibling. The inner box takes the region's
          height, derives a square width from it (`aspect-square`), and caps
          that at the available width / 420px — so the board renders at
          min(width, height) and always leaves room for the narration +
          controls below. `overflow-hidden` is a belt-and-suspenders clip. */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-start gap-2 pt-2 px-2 py-2 overflow-hidden">
        <div className="flex-1 min-h-0 w-full flex items-start justify-center">
          <div className="h-full aspect-square max-w-full md:max-w-[420px]">{board}</div>
        </div>
        {boardExtra && <div className="w-full md:max-w-[420px] shrink-0">{boardExtra}</div>}
      </div>

      {/* Narration */}
      {(narrationRaw || narration) && (
        <div className="px-4 pb-2 min-h-[60px] shrink-0">
          {narrationRaw ?? (
            <div
              className={`rounded-2xl p-3 ${NARRATION_TONE_CLASS[narrationTone]}`}
              data-testid={narrationTestId}
            >
              {/* Cap the prose height so a long Watch beat (60-120 words)
                  scrolls internally instead of pushing the controls off a
                  short screen — full text stays readable + is spoken. */}
              <p className={`text-sm text-theme-text leading-relaxed overflow-y-auto ${chatSplit ? 'max-h-[7vh]' : 'max-h-[26vh]'}`}>{narration}</p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {hasControls && (
        <div className={`px-4 py-3 shrink-0 ${chatSplit ? 'pb-2' : 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4'}`}>
          {customControls ?? <LessonControls {...controls} />}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4 shrink-0">{footer}</div>
      )}
      </div>
      {/* end LEFT column */}

      {/* RIGHT: persistent chat column at md+ (the same board+chat split as
          Learn/Play with Coach). Mounted only on desktop so the mobile drawer
          below never double-mounts GameChatPanel. */}
      {chat && !isMobile && (
        <div className="flex flex-col md:w-2/5 min-h-0 border-l border-theme-border bg-theme-bg" data-testid="lesson-chat-column">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border shrink-0">
            <MessageCircle size={16} className="text-theme-accent" />
            <span className="text-sm font-semibold text-theme-text">Ask the coach</span>
          </div>
          <div className="flex-1 min-h-0">{chatPanel}</div>
        </div>
      )}

      {/* MOBILE: the inline Chat button splits the screen — the lesson column
          above (its board shrinks to stay FULLY visible, since the scaffold
          caps the board to its region) and the chat below, the same stacked
          shape /coach/teach uses on mobile. In-flow (not an overlay) so the
          board is never covered/cut off (David 2026-06-18). */}
      {chat && isMobile && chatOpen && (
        <div
          className="flex flex-col shrink-0 h-[42vh] bg-theme-bg border-t border-theme-border"
          data-testid="lesson-chat"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-theme-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-theme-accent" />
              <span className="text-sm font-semibold text-theme-text">Ask the coach</span>
            </div>
            <button
              type="button"
              onClick={toggleChat}
              className="p-1.5 rounded-lg hover:bg-theme-surface text-theme-text-muted"
              aria-label="Close coach chat"
              data-testid="lesson-chat-close"
            >
              <X size={18} />
            </button>
          </div>
          {/* Bottom-nav clearance so the chat content clears the fixed mobile
              nav (the input is pinned at the top, so it's reachable regardless). */}
          <div className="flex-1 min-h-0 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">{chatPanel}</div>
        </div>
      )}
    </div>
  );
}
