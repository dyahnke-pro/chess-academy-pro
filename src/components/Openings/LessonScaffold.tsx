import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

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
  testId = 'lesson-scaffold',
  backTestId = 'lesson-back',
  titleTestId,
  narrationTestId = 'lesson-narration',
}: LessonScaffoldProps): JSX.Element {
  const hasControls = Boolean(customControls) || Boolean(controls);
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" data-testid={testId}>
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

      {/* Board */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-start pt-2 px-2 py-2">
        <div className="w-full md:max-w-[420px]">{board}</div>
        {boardExtra && <div className="w-full md:max-w-[420px] mt-2">{boardExtra}</div>}
      </div>

      {/* Narration */}
      {(narrationRaw || narration) && (
        <div className="px-4 pb-2 min-h-[60px]">
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
        <div className="px-4 py-3 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
          {customControls ?? <LessonControls {...controls} />}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">{footer}</div>
      )}
    </div>
  );
}
