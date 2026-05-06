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
    <div className={`flex items-center justify-center gap-2 ${className}`} data-testid="move-nav-controls">
      <NavButton onClick={onFirst} disabled={atStart} label="First move">
        <ChevronsLeft size={18} />
      </NavButton>
      <NavButton onClick={onPrev} disabled={atStart} label="Previous move">
        <ChevronLeft size={18} />
      </NavButton>
      {/* Primary "Next" button — matches the walk-phase yellow CTA so
          the dominant control reads the same way on both phases of
          /coach/review. Larger min dimensions, drop shadow, scale-on-tap. */}
      <button
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next move"
        data-testid="nav-next-primary"
        className="rounded-xl disabled:opacity-30 flex items-center justify-center transition-transform active:scale-[0.97]"
        style={{
          background: 'var(--color-accent)',
          minWidth: '96px',
          minHeight: '60px',
          boxShadow: 'var(--color-accent-shadow, 0 2px 8px rgba(201, 168, 76, 0.35))',
        }}
      >
        <ChevronRight size={32} strokeWidth={3} style={{ color: 'var(--color-bg)' }} />
      </button>
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
