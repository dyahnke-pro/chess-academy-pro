import { useEffect, useRef, forwardRef } from 'react';
import type { CoachGameMove, MoveClassification } from '../../types';
import { CLASSIFICATION_STYLES } from './classificationStyles';

interface CompactMoveStripProps {
  moves: CoachGameMove[];
  currentMoveIndex: number | null;
  onMoveClick?: (moveIndex: number) => void;
  className?: string;
}

const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: '#22c55e',
  great: '#4ade80',
  good: 'rgba(255,255,255,0.7)',
  book: '#60a5fa',
  miss: '#a855f7',
  inaccuracy: '#fbbf24',
  mistake: '#f97316',
  blunder: '#ef4444',
};

/**
 * Compact horizontal scrollable move strip — Chess.com-style.
 * Dark background, no move numbers, tight spacing.
 */
export function CompactMoveStrip({
  moves,
  currentMoveIndex,
  onMoveClick,
  className = '',
}: CompactMoveStripProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const scrollLeft = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [currentMoveIndex]);

  return (
    <div
      ref={scrollRef}
      className={`flex items-center gap-px overflow-x-auto scrollbar-none px-1 py-1 ${className}`}
      style={{ background: 'color-mix(in srgb, var(--color-bg) 60%, black)' }}
      data-testid="compact-move-strip"
    >
      {moves.map((move, i) => {
        const isActive = currentMoveIndex === i;
        const cls = move.classification;
        const showBadge = cls && cls !== 'good' && cls !== 'book';

        return (
          <MoveChip
            key={i}
            ref={isActive ? activeRef : null}
            move={move}
            index={i}
            isActive={isActive}
            showBadge={!!showBadge}
            onClick={onMoveClick}
          />
        );
      })}
      {moves.length === 0 && (
        <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Starting position
        </span>
      )}
    </div>
  );
}

interface MoveChipProps {
  move: CoachGameMove;
  index: number;
  isActive: boolean;
  showBadge: boolean;
  onClick?: (index: number) => void;
}

const MoveChip = forwardRef<HTMLButtonElement, MoveChipProps>(
  function MoveChip({ move, index, isActive, showBadge, onClick }, ref) {
    const cls = move.classification;
    const color = cls ? CLASSIFICATION_COLORS[cls] : 'rgba(255,255,255,0.7)';
    const style = cls ? CLASSIFICATION_STYLES[cls] : null;

    return (
      <button
        ref={ref}
        onClick={onClick ? () => onClick(index) : undefined}
        className={`inline-flex items-center gap-0.5 px-1 py-0.5 text-[11px] font-mono whitespace-nowrap shrink-0 ${
          onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        } ${isActive ? 'font-bold' : ''}`}
        style={{
          color: isActive ? '#fff' : color,
          background: isActive
            ? (showBadge ? style?.color ?? 'var(--color-accent)' : 'var(--color-accent)')
            : 'transparent',
          borderRadius: '3px',
        }}
        data-testid={`move-chip-${index}`}
      >
        {showBadge && style && !isActive && (
          <span
            className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[6px] font-bold text-white leading-none shrink-0"
            style={{ background: style.color }}
          >
            {style.symbol}
          </span>
        )}
        <span>{move.san}</span>
      </button>
    );
  },
);
