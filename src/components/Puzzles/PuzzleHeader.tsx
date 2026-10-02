/**
 * PuzzleHeader — the one header every puzzle surface shares (David
 * 2026-10-01): the MOVE COUNT as pips ("2/5" — you know how deep the line is
 * before you start, and each pip lights as you find the move), the puzzle's
 * DIFFICULTY, and your STREAK. Deep-run adds its score through `children`.
 *
 * On a miss the pips stay where you reached, so you see how far you got.
 */
import type { ReactNode } from 'react';

interface PuzzleHeaderProps {
  /** Moves the solver plays in this line. */
  total: number;
  /** Solver moves found so far. */
  done: number;
  /** The puzzle's rating; absent on puzzles that have none (your own
   *  mistakes). */
  difficulty?: number;
  /** Puzzles solved in a row; omitted on surfaces with no session. */
  streak?: number;
  missed?: boolean;
  children?: ReactNode;
}

export function PuzzleHeader({ total, done, difficulty, streak, missed = false, children }: PuzzleHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2" data-testid="puzzle-header">
      {children}
      <div className="flex items-center justify-between gap-3 text-xs">
        {difficulty !== undefined ? (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-theme-surface px-2 py-0.5 font-semibold text-theme-text"
            data-testid="puzzle-rating-badge"
          >
            Difficulty: {difficulty}
          </span>
        ) : <span />}
        <div className="flex items-center gap-1.5" aria-label={`Move ${Math.min(done, total)} of ${total}`} data-testid="move-pips">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border-2 transition-all duration-200 ${
                i < done
                  ? 'scale-110 border-cyan-200 bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.9)]'
                  : missed && i === done
                  ? 'border-rose-400/80 bg-rose-500/30'
                  : 'border-theme-border bg-transparent'
              }`}
              data-testid={i < done ? 'pip-lit' : 'pip-dark'}
            />
          ))}
          <span className="ml-1 font-mono font-bold tabular-nums text-cyan-200" data-testid="move-count">
            {Math.min(done, total)}/{total}
          </span>
        </div>
        {streak !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold tabular-nums ${
              streak > 0 ? 'bg-amber-400/15 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'bg-theme-surface text-theme-text-muted'
            }`}
            data-testid="puzzle-streak"
          >
            Streak {streak}
          </span>
        )}
      </div>
    </div>
  );
}
