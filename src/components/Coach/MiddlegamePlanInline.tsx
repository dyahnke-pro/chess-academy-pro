/**
 * MiddlegamePlanInline
 * --------------------
 * Renders an authored middlegame plan (a WalkthroughSession built by
 * `middlegamePlanner.sessionFromPlan`) IN-PAGE on the Learn-with-Coach
 * surface — instead of bouncing the student to /coach/session/middlegame.
 *
 * Why in-page: David's call (2026-05-29). When you ask Learn-with-Coach
 * for "middle game plans in the Pirc" the plan should play out on the
 * board you're already looking at, keeping the Learn flow intact. This
 * mirrors the runner body in CoachSessionPage (same voice-gated
 * `useWalkthroughRunner`, same lead-the-eye arrows + highlights) but as
 * a self-contained overlay panel.
 *
 * The board is display-only (`ConsistentChessboard` static mode); the
 * runner owns advance via voice-promise resolution — no timer races
 * (see CLAUDE.md → Strict Narration Timing).
 */
import { useMemo, type CSSProperties } from 'react';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { useWalkthroughRunner } from '../../hooks/useWalkthroughRunner';
import type { WalkthroughSession } from '../../types/walkthrough';

interface MiddlegamePlanInlineProps {
  session: WalkthroughSession;
  /** Close the plan and return to the lesson board. */
  onExit: () => void;
}

export function MiddlegamePlanInline({
  session,
  onExit,
}: MiddlegamePlanInlineProps): JSX.Element {
  const runner = useWalkthroughRunner(session);
  const step = runner.currentStep;

  const stepArrows = useMemo(
    () =>
      step?.arrows?.map((a) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: a.color ?? 'rgba(34, 211, 238, 0.9)',
      })),
    [step],
  );

  const stepHighlights: Record<string, CSSProperties> | undefined = useMemo(
    () =>
      step?.highlights
        ? Object.fromEntries(
            step.highlights.map((h) => [
              h.square,
              { boxShadow: `inset 0 0 0 3px ${h.color ?? 'rgba(250, 204, 21, 0.6)'}` },
            ]),
          )
        : undefined,
    [step],
  );

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-theme-bg overflow-y-auto"
      data-testid="middlegame-plan-inline"
    >
      <div className="flex items-start justify-between gap-3 p-3 md:p-4 border-b border-theme-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-bold text-theme-text truncate">
            {session.title}
          </h2>
          <div className="text-xs text-theme-text-muted uppercase tracking-wide">
            {session.subtitle ?? 'Middlegame plan'} ·{' '}
            {Math.max(runner.currentIndex + 1, 0)} / {session.steps.length}
          </div>
        </div>
        <button
          onClick={onExit}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-sm min-h-[44px]"
          aria-label="Back to lesson"
          data-testid="middlegame-plan-exit"
        >
          <ArrowLeft size={16} />
          Lesson
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-3 p-3 md:p-4 max-w-lg mx-auto w-full">
        <div className="w-full">
          <ConsistentChessboard
            fen={runner.fen}
            boardOrientation={session.orientation}
            arrows={stepArrows}
            squareStyles={stepHighlights}
            interactive={false}
          />
        </div>

        {step?.narration && (
          <p className="text-sm text-theme-text leading-snug w-full">
            {step.narration}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={runner.prev}
            disabled={runner.currentIndex <= 0}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border disabled:opacity-40"
            aria-label="Previous move"
          >
            <ChevronLeft size={20} />
          </button>
          {runner.isPlaying ? (
            <button
              onClick={runner.pause}
              className="flex items-center gap-2 px-6 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
              aria-label="Pause"
            >
              <Pause size={18} /> Pause
            </button>
          ) : (
            <button
              onClick={runner.play}
              className="flex items-center gap-2 px-6 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200"
              aria-label="Play"
            >
              <Play size={18} /> {runner.isFinished ? 'Replay' : 'Play'}
            </button>
          )}
          <button
            onClick={runner.next}
            disabled={runner.isFinished}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border disabled:opacity-40"
            aria-label="Next move"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={runner.restart}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-theme-surface border border-theme-border"
            aria-label="Restart"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
