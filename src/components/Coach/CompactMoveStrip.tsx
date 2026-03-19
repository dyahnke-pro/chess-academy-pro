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
  good: 'var(--color-text)',
  book: 'var(--color-accent)',
  miss: '#a855f7',
  inaccuracy: '#fbbf24',
  mistake: '#f97316',
  blunder: '#ef4444',
};

/**
 * Compact horizontal scrollable move strip — Chess.com-style.
 * Shows moves in a single horizontal row with classification badges inline.
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

      // Center the active move in the container
      const scrollLeft = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [currentMoveIndex]);

  return (
    <div
      ref={scrollRef}
      className={`flex items-center gap-0.5 overflow-x-auto scrollbar-none px-2 py-1.5 ${className}`}
      style={{ background: 'var(--color-surface)' }}
      data-testid="compact-move-strip"
    >
      {moves.map((move, i) => {
        const isWhite = i % 2 === 0;
        const moveNum = Math.floor(i / 2) + 1;
        const isActive = currentMoveIndex === i;
        const cls = move.classification;
        const showBadge = cls && cls !== 'good' && cls !== 'book';

        return (
          <span key={i} className="flex items-center shrink-0">
            {/* Move number before white's move */}
            {isWhite && (
              <span
                className="text-[10px] mr-0.5 select-none"
                style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
              >
                {moveNum}.
              </span>
            )}
            <MoveChip
              ref={isActive ? activeRef : null}
              move={move}
              index={i}
              isActive={isActive}
              showBadge={!!showBadge}
              onClick={onMoveClick}
            />
          </span>
        );
      })}
      {moves.length === 0 && (
        <span className="text-xs px-2" style={{ color: 'var(--color-text-muted)' }}>
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
    const color = cls ? CLASSIFICATION_COLORS[cls] : 'var(--color-text)';
    const style = cls ? CLASSIFICATION_STYLES[cls] : null;

    return (
      <button
        ref={ref}
        onClick={onClick ? () => onClick(index) : undefined}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap transition-all ${
          onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        } ${isActive ? 'font-bold' : ''}`}
        style={{
          color: isActive ? (showBadge ? color : 'var(--color-bg)') : color,
          background: isActive
            ? (showBadge ? `color-mix(in srgb, ${color} 20%, var(--color-surface))` : 'var(--color-accent)')
            : 'transparent',
          borderRadius: '4px',
        }}
        data-testid={`move-chip-${index}`}
      >
        {/* Classification badge — small colored dot with symbol */}
        {showBadge && style && (
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold text-white leading-none shrink-0"
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
