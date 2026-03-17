import { useRef, useEffect } from 'react';
import { CLASSIFICATION_STYLES } from './classificationStyles';
import type { KeyMoment, CoachGameMove } from '../../types';

interface CriticalMomentsStripProps {
  moments: KeyMoment[];
  moves: CoachGameMove[];
  currentMoveIndex: number;
  onMomentClick: (moveIndex: number) => void;
}

function getMoveIndexForMoment(moment: KeyMoment, moves: CoachGameMove[]): number {
  return moves.findIndex((m) => m.moveNumber === moment.moveNumber);
}

function getMomentIcon(type: KeyMoment['type']): string {
  switch (type) {
    case 'brilliant': return CLASSIFICATION_STYLES.brilliant.symbol;
    case 'blunder': return CLASSIFICATION_STYLES.blunder.symbol;
    case 'turning_point': return '⚡';
  }
}

function getMomentColor(type: KeyMoment['type']): string {
  switch (type) {
    case 'brilliant': return CLASSIFICATION_STYLES.brilliant.color;
    case 'blunder': return CLASSIFICATION_STYLES.blunder.color;
    case 'turning_point': return '#f59e0b';
  }
}

function getMomentLabel(type: KeyMoment['type']): string {
  switch (type) {
    case 'brilliant': return 'Brilliant';
    case 'blunder': return 'Blunder';
    case 'turning_point': return 'Turning Point';
  }
}

export function CriticalMomentsStrip({
  moments,
  moves,
  currentMoveIndex,
  onMomentClick,
}: CriticalMomentsStripProps): JSX.Element | null {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active chip into view
  useEffect(() => {
    if (activeChipRef.current && scrollRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentMoveIndex]);

  if (moments.length === 0) return null;

  return (
    <div className="px-2 py-1.5 border-b border-theme-border" data-testid="critical-moments-strip">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Key Moments
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {moments.map((moment, i) => {
          const moveIdx = getMoveIndexForMoment(moment, moves);
          const isActive = moveIdx === currentMoveIndex;
          const color = getMomentColor(moment.type);
          const fullMoveNum = Math.ceil(moment.moveNumber / 2);

          return (
            <button
              key={i}
              ref={isActive ? activeChipRef : undefined}
              onClick={() => {
                if (moveIdx >= 0) onMomentClick(moveIdx);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all"
              style={{
                background: isActive
                  ? `color-mix(in srgb, ${color} 20%, var(--color-surface))`
                  : 'var(--color-surface)',
                border: `1.5px solid ${isActive ? color : 'var(--color-border)'}`,
                color: isActive ? color : 'var(--color-text)',
              }}
              data-testid={`critical-moment-${i}`}
            >
              <span style={{ color }}>{getMomentIcon(moment.type)}</span>
              <span>Move {fullMoveNum}</span>
              <span
                className="text-[10px]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {getMomentLabel(moment.type)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
