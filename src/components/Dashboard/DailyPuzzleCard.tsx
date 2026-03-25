import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trophy, ChevronRight } from 'lucide-react';
import {
  fetchLichessDailyPuzzle,
  type LichessDailyPuzzle,
} from '../../services/lichessDailyPuzzleService';

export function DailyPuzzleCard(): JSX.Element {
  const navigate = useNavigate();
  const [puzzle, setPuzzle] = useState<LichessDailyPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchLichessDailyPuzzle()
      .then((p) => { if (!cancelled) setPuzzle(p); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-xl p-5 border flex items-center justify-center h-24"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        data-testid="daily-puzzle-loading"
      >
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        data-testid="daily-puzzle-error"
      >
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} style={{ color: 'var(--color-warning)' }} />
          <h2 className="font-semibold">Daily Puzzle</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Offline — connect to load today's puzzle from Lichess.
        </p>
      </div>
    );
  }

  const themeLabel = puzzle.themes
    .filter((t) => t !== 'oneMove' && t !== 'short' && t !== 'long')
    .slice(0, 2)
    .map((t) => t.replace(/([A-Z])/g, ' $1').trim())
    .join(', ');

  return (
    <button
      onClick={() => void navigate('/puzzles', { state: { lichessDaily: puzzle } })}
      className="rounded-xl p-5 border text-left w-full hover:opacity-90 transition-opacity"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="daily-puzzle-card"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy size={16} style={{ color: 'var(--color-warning)' }} />
          <h2 className="font-semibold">Daily Puzzle</h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Lichess
          </span>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <div className="font-bold text-lg" style={{ color: 'var(--color-accent)' }}>
            {puzzle.rating}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Rating</div>
        </div>
        {themeLabel && (
          <div>
            <div className="font-medium capitalize">{themeLabel}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Theme</div>
          </div>
        )}
        <div className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {puzzle.white} vs {puzzle.black}
        </div>
      </div>
    </button>
  );
}
