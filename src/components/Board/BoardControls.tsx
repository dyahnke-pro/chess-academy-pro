import type { ReactNode } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Undo2 } from 'lucide-react';

interface BoardControlsProps {
  onFirst?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLast?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onTakeback?: () => void;
  canTakeback?: boolean;
  extraLeft?: ReactNode;
  extraRight?: ReactNode;
}

export function BoardControls({
  onFirst,
  onPrev,
  onNext,
  onLast,
  canGoPrev = false,
  canGoNext = false,
  onTakeback,
  canTakeback = false,
  extraLeft,
  extraRight,
}: BoardControlsProps): JSX.Element {
  const navBtnClass = 'p-2 rounded-lg border text-theme-text disabled:opacity-30 hover:bg-theme-surface transition-colors';

  return (
    <div
      className="flex items-center justify-center gap-2 py-2"
      data-testid="board-controls-bar"
    >
      {extraLeft}

      {onTakeback && (
        <button
          onClick={onTakeback}
          disabled={!canTakeback}
          className={navBtnClass}
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="Take back"
          data-testid="takeback-btn"
        >
          <Undo2 size={16} />
        </button>
      )}

      {onFirst && (
        <button
          onClick={onFirst}
          disabled={!canGoPrev}
          className={navBtnClass}
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="First move"
          data-testid="nav-first"
        >
          <ChevronsLeft size={16} />
        </button>
      )}

      {onPrev && (
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className={navBtnClass}
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="Previous move"
          data-testid="nav-prev"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {onNext && (
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={navBtnClass}
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="Next move"
          data-testid="nav-next"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {onLast && (
        <button
          onClick={onLast}
          disabled={!canGoNext}
          className={navBtnClass}
          style={{ borderColor: 'var(--color-border)' }}
          aria-label="Last move"
          data-testid="nav-last"
        >
          <ChevronsRight size={16} />
        </button>
      )}

      {extraRight}
    </div>
  );
}
