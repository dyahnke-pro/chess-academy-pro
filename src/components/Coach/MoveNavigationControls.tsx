import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface MoveNavigationControlsProps {
  currentIndex: number;
  totalMoves: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  className?: string;
}

export function MoveNavigationControls({
  currentIndex,
  totalMoves,
  onFirst,
  onPrev,
  onNext,
  onLast,
  className = '',
}: MoveNavigationControlsProps): JSX.Element {
  const atStart = currentIndex <= -1;
  const atEnd = currentIndex >= totalMoves - 1;

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`} data-testid="move-nav-controls">
      <NavButton onClick={onFirst} disabled={atStart} label="First move">
        <ChevronsLeft size={18} />
      </NavButton>
      <NavButton onClick={onPrev} disabled={atStart} label="Previous move">
        <ChevronLeft size={18} />
      </NavButton>
      <NavButton onClick={onNext} disabled={atEnd} label="Next move">
        <ChevronRight size={18} />
      </NavButton>
      <NavButton onClick={onLast} disabled={atEnd} label="Last move">
        <ChevronsRight size={18} />
      </NavButton>
    </div>
  );
}

interface NavButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}

function NavButton({ onClick, disabled, label, children }: NavButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="p-2 rounded-lg disabled:opacity-30 hover:opacity-80 transition-opacity"
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </button>
  );
}
