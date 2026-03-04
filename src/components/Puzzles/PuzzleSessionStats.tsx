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
      <div className="flex items-center gap-1 text-green-500">
        <CheckCircle size={14} />
        <span className="font-medium">{solved}</span>
      </div>
      <div className="flex items-center gap-1 text-red-500">
        <XCircle size={14} />
        <span className="font-medium">{failed}</span>
      </div>
      {total > 0 && (
        <span className="text-theme-text-muted">{accuracy}%</span>
      )}
      {streak > 1 && (
        <div className="flex items-center gap-1 text-orange-500">
          <Flame size={14} />
          <span className="font-medium">{streak}</span>
        </div>
      )}
      <div className={`flex items-center gap-1 ${ratingChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        <TrendingUp size={14} />
        <span className="font-medium">{ratingChange >= 0 ? '+' : ''}{ratingChange}</span>
      </div>
    </div>
  );
}
