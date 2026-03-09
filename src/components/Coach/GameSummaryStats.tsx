import type { GameAccuracy, MoveClassificationCounts, MoveClassification } from '../../types';

interface GameSummaryStatsProps {
  accuracy: GameAccuracy;
  classificationCounts: MoveClassificationCounts;
  playerColor: 'white' | 'black';
  result: string;
  className?: string;
}

const CLASSIFICATION_CONFIG: Array<{ key: MoveClassification; label: string; color: string }> = [
  { key: 'brilliant', label: 'Brilliant', color: '#22c55e' },
  { key: 'great', label: 'Great', color: '#4ade80' },
  { key: 'good', label: 'Good', color: '#a3a3a3' },
  { key: 'book', label: 'Book', color: '#60a5fa' },
  { key: 'inaccuracy', label: 'Inaccuracy', color: '#fbbf24' },
  { key: 'mistake', label: 'Mistake', color: '#f97316' },
  { key: 'blunder', label: 'Blunder', color: '#ef4444' },
];

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#22c55e';
  if (accuracy >= 60) return '#fbbf24';
  return '#ef4444';
}

export function GameSummaryStats({
  accuracy,
  classificationCounts,
  playerColor,
  result,
  className = '',
}: GameSummaryStatsProps): JSX.Element {
  const playerAccuracy = playerColor === 'white' ? accuracy.white : accuracy.black;
  const ringColor = getAccuracyColor(playerAccuracy);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (circumference * Math.min(playerAccuracy, 100)) / 100;

  const resultLabel = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw';
  const resultColor = result === 'win' ? 'var(--color-success)' : result === 'loss' ? 'var(--color-error)' : 'var(--color-warning)';

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="game-summary-stats">
      {/* Result + Accuracy */}
      <div className="flex items-center gap-4">
        {/* Accuracy ring */}
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="4"
            />
            {/* Accuracy ring */}
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {Math.round(playerAccuracy)}
            </span>
            <span className="text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>
              Accuracy
            </span>
          </div>
        </div>

        {/* Result label */}
        <div className="flex flex-col">
          <span className="text-sm font-bold" style={{ color: resultColor }}>
            {resultLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {accuracy.moveCount} moves analyzed
          </span>
        </div>
      </div>

      {/* Classification breakdown */}
      <div className="flex flex-col gap-1">
        {CLASSIFICATION_CONFIG.map(({ key, label, color }) => {
          const count = classificationCounts[key];
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <span style={{ color: 'var(--color-text)' }} className="flex-1">{label}</span>
              <span className="font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
