import type { GameAccuracy, MoveClassificationCounts } from '../../types';
import { AccuracyRing } from './AccuracyRing';
import { CLASSIFICATION_STYLES, CLASSIFICATION_ORDER } from './classificationStyles';

interface GameSummaryStatsProps {
  accuracy: GameAccuracy;
  classificationCounts: MoveClassificationCounts;
  playerColor: 'white' | 'black';
  result: string;
  className?: string;
}

export function GameSummaryStats({
  accuracy,
  classificationCounts,
  playerColor,
  result,
  className = '',
}: GameSummaryStatsProps): JSX.Element {
  const playerAccuracy = playerColor === 'white' ? accuracy.white : accuracy.black;
  const resultLabel = result === 'win' ? 'Victory' : result === 'loss' ? 'Defeat' : 'Draw';
  const resultColor = result === 'win' ? 'var(--color-success)' : result === 'loss' ? 'var(--color-error)' : 'var(--color-warning)';

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="game-summary-stats">
      {/* Result + Accuracy */}
      <div className="flex items-center gap-4">
        <AccuracyRing accuracy={playerAccuracy} />

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
        {CLASSIFICATION_ORDER.map((key) => {
          const count = classificationCounts[key];
          if (count === 0) return null;
          const { label, color } = CLASSIFICATION_STYLES[key];
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
