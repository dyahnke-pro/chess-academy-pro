import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import type { CoachGameMove, MoveClassification } from '../../types';

interface KeyMomentNavProps {
  moves: CoachGameMove[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
  /** WO-HINT-KEYMOMENT-WIRE-01: extra move indices (0-indexed) the
   *  prev/next nav should also stop on. Used today to surface hint
   *  plies in the same nav as blunders / mistakes / brilliancies.
   *  Deduped against classification-derived indices, sorted ascending. */
  extraIndices?: number[];
}

const KEY_MOMENT_CLASSIFICATIONS: MoveClassification[] = [
  'brilliant', 'blunder', 'mistake', 'miss',
];

function isKeyMoment(move: CoachGameMove): boolean {
  return !!move.classification && KEY_MOMENT_CLASSIFICATIONS.includes(move.classification);
}

export function KeyMomentNav({
  moves,
  currentIndex,
  onNavigate,
  className = '',
  extraIndices,
}: KeyMomentNavProps): JSX.Element {
  const keyMomentIndices = useMemo(
    () => {
      const set = new Set<number>();
      moves.forEach((move, i) => { if (isKeyMoment(move)) set.add(i); });
      if (extraIndices) {
        for (const i of extraIndices) {
          if (Number.isInteger(i) && i >= 0 && i < moves.length) set.add(i);
        }
      }
      return Array.from(set).sort((a, b) => a - b);
    },
    [moves, extraIndices],
  );

  const prevKeyMoment = useMemo(
    () => {
      for (let i = keyMomentIndices.length - 1; i >= 0; i--) {
        if (keyMomentIndices[i] < currentIndex) return keyMomentIndices[i];
      }
      return null;
    },
    [keyMomentIndices, currentIndex],
  );

  const nextKeyMoment = useMemo(
    () => {
      for (const idx of keyMomentIndices) {
        if (idx > currentIndex) return idx;
      }
      return null;
    },
    [keyMomentIndices, currentIndex],
  );

  const handlePrev = useCallback(() => {
    if (prevKeyMoment !== null) onNavigate(prevKeyMoment);
  }, [prevKeyMoment, onNavigate]);

  const handleNext = useCallback(() => {
    if (nextKeyMoment !== null) onNavigate(nextKeyMoment);
  }, [nextKeyMoment, onNavigate]);

  if (keyMomentIndices.length === 0) return <div className={className} />;

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      data-testid="key-moment-nav"
    >
      <button
        onClick={handlePrev}
        disabled={prevKeyMoment === null}
        className="p-1.5 rounded-lg transition-opacity disabled:opacity-30 hover:opacity-80"
        style={{ color: 'var(--color-text)' }}
        aria-label="Previous key moment"
        data-testid="prev-key-moment"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'var(--color-surface)' }}>
        <Zap size={12} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Key Moment
        </span>
      </div>
      <button
        onClick={handleNext}
        disabled={nextKeyMoment === null}
        className="p-1.5 rounded-lg transition-opacity disabled:opacity-30 hover:opacity-80"
        style={{ color: 'var(--color-text)' }}
        aria-label="Next key moment"
        data-testid="next-key-moment"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
