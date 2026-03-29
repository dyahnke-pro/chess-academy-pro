import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Flame, Target, TrendingUp, TrendingDown } from 'lucide-react';
import type { AdaptiveSessionState } from '../../services/adaptivePuzzleService';
import { ADAPTIVE_CONFIGS } from '../../services/adaptivePuzzleService';

interface AdaptiveSessionPanelProps {
  session: AdaptiveSessionState;
}

export function AdaptiveSessionPanel({ session }: AdaptiveSessionPanelProps): JSX.Element {
  const config = ADAPTIVE_CONFIGS[session.difficulty];
  const accuracy = session.totalPuzzles > 0
    ? Math.round((session.puzzlesSolved / session.totalPuzzles) * 100)
    : 0;

  const ratingDelta = session.sessionRating - config.startRating;
  const chartData = session.ratingHistory.map((rating, i) => ({ index: i, rating }));

  return (
    <div className="bg-theme-surface rounded-lg p-4 space-y-4" data-testid="adaptive-session-panel">
      {/* Session Rating */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-theme-text">Session Rating</h3>
          <div className="flex items-center gap-1" style={{ color: ratingDelta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {ratingDelta >= 0
              ? <TrendingUp size={14} />
              : <TrendingDown size={14} />}
            <span className="text-sm font-bold">
              {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-theme-text" data-testid="session-rating">
          {session.sessionRating}
        </div>
      </div>

      {/* Rating Sparkline */}
      {chartData.length > 1 && (
        <div className="h-16" data-testid="rating-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={[config.ratingFloor, config.ratingCeiling]} hide />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="var(--color-accent, #3b82f6)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--color-success)' }} data-testid="solved-count">
            {session.puzzlesSolved}
          </div>
          <div className="text-xs text-theme-text-muted">Solved</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: 'var(--color-error)' }} data-testid="failed-count">
            {session.puzzlesFailed}
          </div>
          <div className="text-xs text-theme-text-muted">Failed</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Target size={14} className="text-theme-accent" />
            <span className="text-lg font-bold text-theme-text" data-testid="accuracy">
              {accuracy}%
            </span>
          </div>
          <div className="text-xs text-theme-text-muted">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame size={14} style={session.streak >= 3 ? { color: 'var(--color-warning)' } : undefined} className={session.streak < 3 ? 'text-theme-text-muted' : ''} />
            <span className="text-lg font-bold text-theme-text" data-testid="streak">
              {session.streak}
            </span>
          </div>
          <div className="text-xs text-theme-text-muted">Streak</div>
        </div>
      </div>

      {/* Weakness indicator */}
      {session.weakThemeBoost && (
        <div className="text-xs text-amber-500 bg-amber-500/10 rounded-md px-2 py-1" data-testid="weakness-indicator">
          Targeting weak tactics...
        </div>
      )}
    </div>
  );
}
