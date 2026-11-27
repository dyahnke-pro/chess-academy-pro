import { BookOpen, Play } from 'lucide-react';

/** The board bar's button look — one source, so the line button reads the
 *  same in the bar and under a board that has no bar. */
export const BOARD_BUTTON_CLASS =
  'flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';

/** The extras row's button look — every screen-only control under the board
 *  bar (Solution, Next, Restart, Skip…) wears this one class, so a control
 *  looks the same on every board. */
export const BOARD_EXTRA_CLASS =
  'flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap disabled:opacity-30 transition-colors border-cyan-500/30 text-cyan-400';

interface PlayLineButtonProps {
  /** Plays the line the coach last stated, or null (greyed) when none. */
  onPlay: (() => void) | null;
  testId?: string;
  /** Full width under a board with no bar; the bar sizes its own column. */
  wide?: boolean;
}

/**
 * THE ONE PLAY-LINE BUTTON (David 2026-11-17: "I just want one button for
 * unification. Make sure it looks the same, is directly under the board …
 * and make sure they all do the same thing"). Every board renders this button
 * directly under it — inside the board bar, or on its own where a board has
 * no bar — and it always does one thing: `useLineWalk.playStated`, the line
 * the coach last stated, walked on the board move by move.
 */
export function PlayLineButton({ onPlay, testId = 'board-bar-line', wide = false }: PlayLineButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onPlay ?? undefined}
      disabled={!onPlay}
      className={`${BOARD_BUTTON_CLASS}${wide ? ' w-full' : ''}`}
      data-testid={testId}
      aria-label="Play out the line on the board"
    >
      <Play size={16} />
      <span className="text-[11px] leading-none whitespace-nowrap">Play line</span>
    </button>
  );
}

interface TheoryButtonProps {
  /** Opens the theory view, or null (greyed). */
  onTheory: (() => void) | null;
  /** True while the theory view plays: a press stops it. */
  playing: boolean;
  onStop: () => void;
  testId?: string;
}

/**
 * THE LINE SLOT DURING THE OPENING (David, the board bar decisions,
 * 2026-11-24: "Play line becomes Theory during the opening"). Same place, same
 * look as the Play-line button; it opens the theory view (`useTheoryView`).
 */
export function TheoryButton({ onTheory, playing, onStop, testId = 'board-bar-theory' }: TheoryButtonProps): JSX.Element {
  const on = playing ? onStop : onTheory;
  return (
    <button
      type="button"
      onClick={on ?? undefined}
      disabled={!on}
      className={BOARD_BUTTON_CLASS}
      data-testid={testId}
      data-playing={playing ? 'true' : undefined}
      aria-label={playing ? 'Stop the theory and return to the game' : 'Opening theory: the idea played forward from where the game left book'}
    >
      <BookOpen size={16} />
      <span className="text-[11px] leading-none whitespace-nowrap">{playing ? 'Back to game' : 'Theory'}</span>
    </button>
  );
}
