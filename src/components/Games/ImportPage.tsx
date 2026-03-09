import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { importLichessGames, importLichessStats } from '../../services/lichessService';
import { importChessComGames, importChessComStats } from '../../services/chesscomService';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { ArrowLeft, Loader2, CheckCircle, TrendingUp } from 'lucide-react';
import type { PlatformStats, UserProfile } from '../../types';

type Platform = 'lichess' | 'chesscom';

const PLATFORM_LABELS: Record<Platform, string> = {
  chesscom: 'Chess.com',
  lichess: 'Lichess',
};

/**
 * Pick the "primary" rating from platform stats.
 * Prefers rapid > blitz > bullet.
 */
function getPrimaryRating(stats: PlatformStats): number | null {
  if (stats.rapid) return stats.rapid.rating;
  if (stats.blitz) return stats.blitz.rating;
  if (stats.bullet) return stats.bullet.rating;
  return null;
}

export function ImportPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [platform, setPlatform] = useState<Platform>('chesscom');
  const [username, setUsername] = useState('');
  const [importing, setImporting] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [gameResult, setGameResult] = useState<number | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((count: number, status?: string) => {
    setProgressCount(count);
    if (status) setProgressStatus(status);
  }, []);

  const handleImport = async (): Promise<void> => {
    if (!username.trim()) return;
    setImporting(true);
    setProgressCount(0);
    setProgressStatus('Starting import...');
    setGameResult(null);
    setStats(null);
    setError(null);

    try {
      // Import games
      const count = platform === 'lichess'
        ? await importLichessGames(username, handleProgress)
        : await importChessComGames(username, handleProgress);

      setGameResult(count);

      // Import stats
      setProgressStatus('Fetching player stats...');
      let platformStats: PlatformStats | null = null;
      try {
        platformStats = platform === 'lichess'
          ? await importLichessStats(username)
          : await importChessComStats(username);
        setStats(platformStats);
      } catch {
        // Stats are best-effort
      }

      // Save username + update profile
      if (activeProfile) {
        const prefKey = platform === 'chesscom' ? 'chessComUsername' : 'lichessUsername';
        const updates: Partial<UserProfile> = {
          preferences: { ...activeProfile.preferences, [prefKey]: username.trim() },
        };

        if (platformStats) {
          const primaryRating = getPrimaryRating(platformStats);
          if (primaryRating) {
            updates.currentRating = primaryRating;
          }
          if (platformStats.puzzleRating) {
            updates.puzzleRating = platformStats.puzzleRating;
          }
        }

        await db.profiles.update(activeProfile.id, updates);
        const refreshed = await db.profiles.get(activeProfile.id);
        if (refreshed) {
          setActiveProfile(refreshed);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      setProgressStatus('');
    }
  };

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="import-page"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate('/games')}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold">Import Games & Stats</h1>
      </div>

      {/* Platform toggle */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-bg-secondary)' }}>
        {(['chesscom', 'lichess'] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPlatform(p);
              setGameResult(null);
              setStats(null);
              setError(null);
            }}
            className="flex-1 py-2 rounded-md text-sm font-medium"
            style={{
              background: platform === p ? 'var(--color-surface)' : 'transparent',
              color: platform === p ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
            data-testid={`platform-${p}`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Username input */}
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {PLATFORM_LABELS[platform]} Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleImport();
          }}
          placeholder="Enter username..."
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="username-input"
        />
      </div>

      {/* Import button */}
      <button
        onClick={() => void handleImport()}
        disabled={importing || !username.trim()}
        className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="import-btn"
      >
        {importing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Importing...
          </>
        ) : (
          'Import Games & Stats'
        )}
      </button>

      {/* Progress */}
      {importing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {progressStatus}
            </span>
          </div>
          {progressCount > 0 && (
            <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
              {progressCount} game{progressCount !== 1 ? 's' : ''} imported so far...
            </p>
          )}
        </div>
      )}

      {/* Game result */}
      {gameResult !== null && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.1)' }}
          data-testid="import-result"
        >
          <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            {gameResult === 0
              ? 'No new games to import — you\'re up to date!'
              : `Imported ${gameResult} game${gameResult !== 1 ? 's' : ''}!`
            }
          </span>
        </div>
      )}

      {/* Stats summary */}
      {stats && (
        <div
          className="p-4 rounded-lg space-y-2"
          style={{ background: 'rgba(59,130,246,0.1)' }}
          data-testid="import-stats"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              Player Stats
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.rapid && (
              <div className="p-2 rounded-md" style={{ background: 'var(--color-surface)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Rapid</div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.rapid.rating}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {stats.rapid.wins}W / {stats.rapid.losses}L / {stats.rapid.draws}D
                </div>
              </div>
            )}
            {stats.blitz && (
              <div className="p-2 rounded-md" style={{ background: 'var(--color-surface)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Blitz</div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.blitz.rating}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {stats.blitz.wins}W / {stats.blitz.losses}L / {stats.blitz.draws}D
                </div>
              </div>
            )}
            {stats.bullet && (
              <div className="p-2 rounded-md" style={{ background: 'var(--color-surface)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Bullet</div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.bullet.rating}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {stats.bullet.wins}W / {stats.bullet.losses}L / {stats.bullet.draws}D
                </div>
              </div>
            )}
            {stats.puzzleRating && (
              <div className="p-2 rounded-md" style={{ background: 'var(--color-surface)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Puzzles</div>
                <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.puzzleRating}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm font-medium text-center" style={{ color: 'var(--color-error)' }} data-testid="import-error">
          {error}
        </p>
      )}
    </div>
  );
}
