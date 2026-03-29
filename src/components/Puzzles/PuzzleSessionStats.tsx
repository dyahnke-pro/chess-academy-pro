import { CheckCircle, XCircle, Flame, TrendingUp } from 'lucide-react';

interface PuzzleSessionStatsProps {
  solved: number;
  failed: number;
  streak: number;
  ratingChange: number;
}

export function PuzzleSessionStats({
  solved,
  failed,
  streak,
  ratingChange,
}: PuzzleSessionStatsProps): JSX.Element {
  const total = solved + failed;
  const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 text-xs" data-testid="session-stats">
      <div className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
        <CheckCircle size={14} aria-hidden="true" />
        <span className="font-medium" aria-label={`${solved} solved`}>{solved}</span>
      </div>
      <div className="flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
        <XCircle size={14} aria-hidden="true" />
        <span className="font-medium" aria-label={`${failed} failed`}>{failed}</span>
      </div>
      {total > 0 && (
        <span className="text-theme-text-muted" aria-label={`${accuracy}% accuracy`}>{accuracy}%</span>
      )}
      {streak > 1 && (
        <div className="flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
          <Flame size={14} aria-hidden="true" />
          <span className="font-medium" aria-label={`${streak} streak`}>{streak}</span>
        </div>
      )}
      <div className="flex items-center gap-1" style={{ color: ratingChange >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
        <TrendingUp size={14} aria-hidden="true" />
        <span className="font-medium" aria-label={`Rating change: ${ratingChange >= 0 ? '+' : ''}${ratingChange}`}>
          {ratingChange >= 0 ? '+' : ''}{ratingChange}
        </span>
      </div>
    </div>
  );
}
