import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Volume2, Loader2, HelpCircle, Play } from 'lucide-react';

/** The six core buttons — the same six, in the same order, on every board. */
export type BoardBarButton = 'back' | 'forward' | 'hint' | 'read' | 'why' | 'line';

export interface CoachBoardBarProps {
  /** Each core action: a handler, or null when it does not apply here — a
   *  null button is GREYED, never hidden, so every board looks identical
   *  (David 2026-10-07: "Keep the boards identical … Greyed out"). */
  onBack: (() => void) | null;
  onForward: (() => void) | null;
  onHint: (() => void) | null;
  onRead: (() => void) | null;
  onWhy: (() => void) | null;
  /** Walks the line the coach last proved — only on this press. */
  onPlayLine: (() => void) | null;
  /** True while the position is being read aloud. */
  reading?: boolean;
  /** The hint's current step, when the surface ladders its hints. */
  hintLabel?: string;
  /** The hint ladder's step (0–3), exposed as `data-level` for the audits. */
  hintLevel?: number;
  /** Screen-only extras (play/pause, takeback, restart, pace…) — ONE small
   *  row, in the same place on every board. */
  extras?: ReactNode;
  /** Selectors the existing audits and tests already use, per button. */
  testIds?: Partial<Record<BoardBarButton, string>>;
  /** `useBoardFit`'s keepRef: the board gives up height until this whole bar
   *  (extras included) sits above the bottom nav. */
  keepRef?: (el: HTMLElement | null) => void;
}

const LABEL: Record<BoardBarButton, string> = {
  back: 'Back', forward: 'Forward', hint: 'Hint', read: 'Read', why: 'Why?', line: 'Play line',
};
const ARIA: Record<BoardBarButton, string> = {
  back: 'Previous move',
  forward: 'Next move',
  hint: 'Hint',
  read: 'Read this position aloud',
  why: 'Why? — the proof behind what the coach just said',
  line: 'Play out the line on the board',
};

/**
 * THE ONE BOARD BAR (David 2026-10-07: "Keep the boards identical. I don't
 * want the why button on 4 different places. All buttons NEED to be visible
 * without scrolling down! Even the show the line button"). Learn, Play, Review
 * and the Openings Play rung render this bar directly under the board. Six
 * equal columns fit a 375px phone on one row; the page keeps the bar on
 * screen by capping the board's height (`ChessLessonLayout` / page layout).
 */
export function CoachBoardBar(props: CoachBoardBarProps): JSX.Element {
  const handler: Record<BoardBarButton, (() => void) | null> = {
    back: props.onBack, forward: props.onForward, hint: props.onHint,
    read: props.onRead, why: props.onWhy, line: props.onPlayLine,
  };
  const icon = (b: BoardBarButton): ReactNode => {
    switch (b) {
      case 'back': return <ChevronLeft size={18} />;
      case 'forward': return <ChevronRight size={18} />;
      case 'hint': return <Lightbulb size={16} />;
      case 'read': return props.reading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />;
      case 'why': return <HelpCircle size={16} />;
      case 'line': return <Play size={16} />;
    }
  };
  const order: BoardBarButton[] = ['back', 'forward', 'hint', 'read', 'why', 'line'];
  return (
    <div ref={props.keepRef} className="flex flex-col gap-1 w-full flex-shrink-0" data-testid="coach-board-bar">
      <div className="grid grid-cols-6 gap-1 w-full">
        {order.map((b) => {
          const on = handler[b];
          return (
            <button
              key={b}
              type="button"
              onClick={on ?? undefined}
              disabled={!on}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              data-testid={props.testIds?.[b] ?? `board-bar-${b}`}
              aria-label={ARIA[b]}
              data-level={b === 'hint' ? props.hintLevel : undefined}
            >
              {icon(b)}
              <span className="text-[11px] leading-none whitespace-nowrap">{b === 'hint' && props.hintLabel ? props.hintLabel : b === 'read' && props.reading ? 'Reading…' : LABEL[b]}</span>
            </button>
          );
        })}
      </div>
      {/* One line: centred when it fits, scrolls sideways from its first
          button when it does not (never clipped on the left). */}
      {props.extras ? <div className="overflow-x-auto" data-testid="coach-board-bar-extras"><div className="flex items-center gap-1 w-max mx-auto">{props.extras}</div></div> : null}
    </div>
  );
}
