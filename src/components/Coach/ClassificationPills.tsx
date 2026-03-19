import type { MoveClassificationCounts } from '../../types';
import { CLASSIFICATION_STYLES, CLASSIFICATION_ORDER } from './classificationStyles';

interface ClassificationPillsProps {
  counts: MoveClassificationCounts;
  className?: string;
}

export function ClassificationPills({
  counts,
  className = '',
}: ClassificationPillsProps): JSX.Element {
  const pills = CLASSIFICATION_ORDER
    .filter((key) => counts[key] > 0)
    .map((key) => ({
      key,
      count: counts[key],
      ...CLASSIFICATION_STYLES[key],
    }));

  if (pills.length === 0) {
    return (
      <div
        className={`text-xs text-center ${className}`}
        style={{ color: 'var(--color-text-muted)' }}
        data-testid="classification-pills"
      >
        No classified moves
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap justify-center gap-2 ${className}`}
      data-testid="classification-pills"
    >
      {pills.map((pill) => (
        <div
          key={pill.key}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: `${pill.color}18`,
            border: `1px solid ${pill.color}40`,
          }}
          data-testid={`pill-${pill.key}`}
        >
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: pill.color }}
          >
            {pill.symbol.length <= 2 ? pill.symbol : ''}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: pill.color }}
          >
            {pill.count}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {pill.label}
          </span>
        </div>
      ))}
    </div>
  );
}
