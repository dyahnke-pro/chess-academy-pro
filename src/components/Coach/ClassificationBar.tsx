import type { MoveClassificationCounts } from '../../types';
import { CLASSIFICATION_STYLES, CLASSIFICATION_ORDER } from './classificationStyles';

interface ClassificationBarProps {
  counts: MoveClassificationCounts;
  totalMoves: number;
  className?: string;
}

export function ClassificationBar({
  counts,
  totalMoves,
  className = '',
}: ClassificationBarProps): JSX.Element {
  const segments = CLASSIFICATION_ORDER
    .filter((key) => counts[key] > 0)
    .map((key) => ({
      key,
      count: counts[key],
      percent: totalMoves > 0 ? (counts[key] / totalMoves) * 100 : 0,
      ...CLASSIFICATION_STYLES[key],
    }));

  if (segments.length === 0) {
    return (
      <div
        className={`text-xs text-center py-2 ${className}`}
        style={{ color: 'var(--color-text-muted)' }}
        data-testid="classification-bar"
      >
        No classified moves
      </div>
    );
  }

  return (
    <div className={className} data-testid="classification-bar">
      {/* Stacked horizontal bar */}
      <div className="flex h-5 rounded-md overflow-hidden gap-px">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center justify-center transition-all"
            style={{
              width: `${Math.max(seg.percent, 4)}%`,
              background: seg.color,
            }}
            title={`${seg.label}: ${seg.count}`}
            data-testid={`bar-segment-${seg.key}`}
          >
            <span className="text-[10px] font-bold text-white drop-shadow-sm">
              {seg.symbol}
            </span>
          </div>
        ))}
      </div>

      {/* Legend below */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0 flex items-center justify-center text-[6px] font-bold text-white"
              style={{ background: seg.color }}
            >
              {seg.symbol.length <= 2 ? '' : ''}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {seg.count}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
