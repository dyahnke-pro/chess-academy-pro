import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { Trophy, Target, Flame, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import type { AdaptiveSessionSummary as SummaryData } from '../../services/adaptivePuzzleService';
import { formatThemeName } from '../../services/lichessPuzzleService';

interface AdaptiveSessionSummaryProps {
  summary: SummaryData;
  onBackToSelect: () => void;
  onPlayAgain: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function AdaptiveSessionSummary({
  summary,
  onBackToSelect,
  onPlayAgain,
}: AdaptiveSessionSummaryProps): JSX.Element {
  const ratingDelta = summary.endRating - summary.startRating;
  const chartData = summary.ratingHistory.map((rating, i) => ({ puzzle: i, rating }));

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto" data-testid="session-summary">
      {/* Title */}
      <div className="text-center">
        <Trophy size={48} className="text-amber-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-theme-text">Session Complete</h2>
        <p className="text-sm text-theme-text-muted mt-1">
          {summary.totalPuzzles} puzzles in {formatDuration(summary.duration)}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4 w-full">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }} data-testid="summary-solved">
            {summary.puzzlesSolved}
          </div>
          <div className="text-xs text-theme-text-muted">Solved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--color-error)' }} data-testid="summary-failed">
            {summary.puzzlesFailed}
          </div>
          <div className="text-xs text-theme-text-muted">Failed</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Target size={16} className="text-theme-accent" />
            <span className="text-2xl font-bold text-theme-text" data-testid="summary-accuracy">
              {Math.round(summary.accuracy * 100)}%
            </span>
          </div>
          <div className="text-xs text-theme-text-muted">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame size={16} style={{ color: 'var(--color-warning)' }} />
            <span className="text-2xl font-bold text-theme-text" data-testid="summary-streak">
              {summary.bestStreak}
            </span>
          </div>
          <div className="text-xs text-theme-text-muted">Best Streak</div>
        </div>
      </div>

      {/* Rating Change */}
      <div className="bg-theme-surface rounded-lg p-4 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-theme-text">Session Rating</h3>
          <div className="flex items-center gap-1">
            {ratingDelta >= 0
              ? <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
              : <TrendingDown size={16} style={{ color: 'var(--color-error)' }} />}
            <span className="text-lg font-bold" style={{ color: ratingDelta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {ratingDelta >= 0 ? '+' : ''}{ratingDelta}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-theme-text-muted mb-3">
          <span>{summary.startRating}</span>
          <span>→</span>
          <span className="font-semibold text-theme-text">{summary.endRating}</span>
        </div>

        {/* Rating Chart */}
        {chartData.length > 2 && (
          <div className="h-24" data-testid="summary-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="puzzle" hide />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface, #1f2937)',
                    border: '1px solid var(--color-border, #374151)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(val) => `Puzzle ${val}`}
                />
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
      </div>

      {/* Weak Themes */}
      {summary.weakestThemes.length > 0 && (
        <div className="bg-theme-surface rounded-lg p-4 w-full">
          <h3 className="text-sm font-semibold text-theme-text mb-3">Areas to Improve</h3>
          <div className="space-y-2">
            {summary.weakestThemes.map((t) => (
              <div key={t.theme} className="flex items-center justify-between">
                <span className="text-sm text-theme-text">{formatThemeName(t.theme)}</span>
                <span className="text-sm font-medium" style={{ color: t.accuracy < 0.5 ? 'var(--color-error)' : 'var(--color-warning)' }}>
                  {Math.round(t.accuracy * 100)}% ({t.total} puzzles)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="flex items-center gap-2 text-sm text-theme-text-muted">
        <Clock size={14} />
        <span>Total time: {formatDuration(summary.duration)}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full">
        <button
          onClick={onBackToSelect}
          className="flex-1 px-4 py-2 rounded-lg border border-theme-border text-theme-text hover:bg-theme-surface transition-colors"
          data-testid="back-to-select"
        >
          Change Difficulty
        </button>
        <button
          onClick={onPlayAgain}
          className="flex-1 px-4 py-2 rounded-lg bg-theme-accent text-white font-medium hover:opacity-90 transition-opacity"
          data-testid="play-again"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
