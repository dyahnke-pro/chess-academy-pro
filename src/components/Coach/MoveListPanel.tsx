import { useEffect, useRef } from 'react';
import type { CoachGameMove, MoveClassification } from '../../types';

interface MoveListPanelProps {
  moves: CoachGameMove[];
  openingName: string | null;
  currentMoveIndex: number | null;
  onMoveClick?: (moveIndex: number) => void;
  className?: string;
}

const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  brilliant: 'var(--color-success)',
  great: 'var(--color-success)',
  good: 'var(--color-text)',
  book: 'var(--color-accent)',
  inaccuracy: 'var(--color-warning)',
  mistake: 'var(--color-error)',
  blunder: 'var(--color-error)',
};

const CLASSIFICATION_SYMBOLS: Partial<Record<MoveClassification, string>> = {
  brilliant: '!!',
  great: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

export function MoveListPanel({
  moves,
  openingName,
  currentMoveIndex,
  onMoveClick,
  className = '',
}: MoveListPanelProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMoveIndex]);

  // Group moves into pairs (white + black)
  const pairs: Array<{ number: number; white: { move: CoachGameMove; index: number } | null; black: { move: CoachGameMove; index: number } | null }> = [];

  for (let i = 0; i < moves.length; i++) {
    const pairIndex = Math.floor(i / 2);
    if (!pairs[pairIndex]) {
      pairs[pairIndex] = { number: pairIndex + 1, white: null, black: null };
    }
    if (i % 2 === 0) {
      pairs[pairIndex].white = { move: moves[i], index: i };
    } else {
      pairs[pairIndex].black = { move: moves[i], index: i };
    }
  }

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ background: 'var(--color-surface)' }}
      data-testid="move-list-panel"
    >
      {/* Opening name header */}
      {openingName && (
        <div
          className="px-3 py-1.5 text-xs font-medium border-b truncate"
          style={{ color: 'var(--color-accent)', borderColor: 'var(--color-border)' }}
          data-testid="opening-name"
        >
          {openingName}
        </div>
      )}

      {/* Move list */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">
        {pairs.length === 0 && (
          <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            Starting Position
          </div>
        )}
        {pairs.map((pair) => (
          <div key={pair.number} className="flex items-center text-xs">
            {/* Move number */}
            <span
              className="w-8 text-right pr-1.5 flex-shrink-0 select-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {pair.number}.
            </span>

            {/* White move */}
            {pair.white ? (
              <MoveCell
                move={pair.white.move}
                index={pair.white.index}
                isActive={currentMoveIndex === pair.white.index}
                onClick={onMoveClick}
                ref={currentMoveIndex === pair.white.index ? activeRef : null}
              />
            ) : (
              <span className="flex-1 px-1.5 py-0.5">&nbsp;</span>
            )}

            {/* Black move */}
            {pair.black ? (
              <MoveCell
                move={pair.black.move}
                index={pair.black.index}
                isActive={currentMoveIndex === pair.black.index}
                onClick={onMoveClick}
                ref={currentMoveIndex === pair.black.index ? activeRef : null}
              />
            ) : (
              <span className="flex-1 px-1.5 py-0.5">&nbsp;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { forwardRef } from 'react';

interface MoveCellProps {
  move: CoachGameMove;
  index: number;
  isActive: boolean;
  onClick?: (index: number) => void;
}

const MoveCell = forwardRef<HTMLButtonElement, MoveCellProps>(
  function MoveCell({ move, index, isActive, onClick }, ref) {
    const color = move.classification
      ? CLASSIFICATION_COLORS[move.classification]
      : 'var(--color-text)';

    const symbol = move.classification
      ? CLASSIFICATION_SYMBOLS[move.classification] ?? ''
      : '';

    return (
      <button
        ref={ref}
        onClick={onClick ? () => onClick(index) : undefined}
        className={`flex-1 px-1.5 py-0.5 text-left font-mono transition-colors ${
          onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        }`}
        style={{
          color,
          background: isActive ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)' : 'transparent',
          borderRadius: isActive ? '2px' : undefined,
        }}
        data-testid={`move-cell-${index}`}
      >
        {move.san}
        {symbol && (
          <span style={{ color, fontSize: '0.65rem' }}>{symbol}</span>
        )}
      </button>
    );
  },
);
