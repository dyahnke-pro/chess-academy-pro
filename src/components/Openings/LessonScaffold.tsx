import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { GameChatPanel } from '../Coach/GameChatPanel';

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
  /** When set, mounts the inline coach chat panel — BELOW the board on mobile
   *  (the page scrolls down to it), a right-hand column at md+ — the same
   *  shape + GameChatPanel (native "Game Chat" header) as Learn/Play with
   *  Coach. */
  chat?: LessonChatContext;
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
  testId = 'lesson-scaffold',
  backTestId = 'lesson-back',
  titleTestId,
  narrationTestId = 'lesson-narration',
}: LessonScaffoldProps): JSX.Element {
  const hasControls = Boolean(customControls) || Boolean(controls);

  /** The inline coach chat — the SAME GameChatPanel /coach/play mounts, WITH
   *  its native "Game Chat" header (matches Learn/Play with Coach — David
   *  2026-06-18 "make the chat panel match this"). Grounded on the lesson's
   *  current position; Q&A + arrows only (no move-mutation handlers), so the
   *  lesson board is never hijacked. */
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
      className="h-full"
    />
  ) : null;

  return (
    // Same shell as /coach/teach (Learn with Coach): the WHOLE page SCROLLS on
    // mobile (board on top → chat panel BELOW), two columns at md+. The board
    // is WIDTH-driven so it never resizes when the mobile address bar shows /
    // hides on scroll (David 2026-06-18 "board shrinks and grows on scroll").
    // `overflow-x-hidden` kills the stray side-scroll. (David 2026-06-18)
    <div
      className="relative flex flex-col md:flex-row h-full overflow-x-hidden overflow-y-auto md:overflow-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      data-testid={testId}
    >
      {/* LEFT: the lesson. flex-none so it flows at natural height inside the
          scrolling page on mobile; a fixed 3/5 column (scrolls internally) at
          md+. */}
      <div className={`flex flex-col flex-none min-h-0 ${chat ? 'md:w-3/5' : 'md:flex-1'} md:overflow-y-auto`}>
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
          {headerAction && <div className="flex items-center gap-2 shrink-0">{headerAction}</div>}
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

        {/* Board — WIDTH-driven (stable; never resizes when the mobile address
            bar shows/hides). The page scrolls if it doesn't all fit. */}
        <div className="px-2 pt-2 flex justify-center w-full">
          <div className="w-full max-w-full md:max-w-[420px]">{board}</div>
        </div>
        {boardExtra && (
          <div className="px-2 flex justify-center w-full">
            <div className="w-full max-w-full md:max-w-[420px] mt-2">{boardExtra}</div>
          </div>
        )}

        {/* Narration */}
        {(narrationRaw || narration) && (
          <div className="px-4 pt-2 pb-1">
            {narrationRaw ?? (
              <div
                className={`rounded-2xl p-3 ${NARRATION_TONE_CLASS[narrationTone]}`}
                data-testid={narrationTestId}
              >
                <p className="text-sm text-theme-text leading-relaxed">{narration}</p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        {hasControls && (
          <div className="px-4 py-2">
            {customControls ?? <LessonControls {...controls} />}
          </div>
        )}

        {/* Footer */}
        {footer && <div className="px-4 pb-2">{footer}</div>}
      </div>
      {/* end LEFT column */}

      {/* CHAT — BELOW the board on mobile (page scrolls to it), a right-hand
          column at md+. `flex-none min-h-[60vh]` on mobile so it keeps a real,
          usable height instead of collapsing to zero (the bug that broke
          scrolling — same fix as #733 for /coach/play). Native GameChatPanel
          header, flush under the board. */}
      {chat && (
        <div
          className="flex flex-col flex-none md:flex-1 md:w-2/5 min-h-[60vh] md:min-h-0 border-t md:border-t-0 md:border-l border-theme-border bg-theme-bg md:overflow-hidden"
          data-testid="lesson-chat"
        >
          {chatPanel}
        </div>
      )}
    </div>
  );
}
