import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { importChessComGames, importChessComStats } from '../../services/chesscomService';
import { importLichessGames, importLichessStats } from '../../services/lichessService';
import { db } from '../../db/schema';
import type { PlatformStats, UserProfile } from '../../types';

type ImportPlatform = 'chesscom' | 'lichess';

interface GameImportCardProps {
  onImportComplete: (count: number) => void;
}

interface ImportResult {
  gameCount: number;
  stats: PlatformStats | null;
}

const PLATFORM_LABELS: Record<ImportPlatform, string> = {
  chesscom: 'Chess.com',
  lichess: 'Lichess',
};

/**
 * Pick the "primary" rating from platform stats.
 * Prefers rapid > blitz > bullet, using the current rating.
 */
function getPrimaryRating(stats: PlatformStats): number | null {
  if (stats.rapid) return stats.rapid.rating;
  if (stats.blitz) return stats.blitz.rating;
  if (stats.bullet) return stats.bullet.rating;
  return null;
}

export function GameImportCard({ onImportComplete }: GameImportCardProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [activeTab, setActiveTab] = useState<ImportPlatform>('chesscom');
  const [username, setUsername] = useState('');
  const [importing, setImporting] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🔒 IS THIS CARD STILL MOUNTED? (2026-09-21)
   *
   * `handleImport` is a long async handler — a network import, then Dexie
   * writes, then a profile refresh — and every exit path calls `setState`
   * (`setError`, `setImporting`, `setProgressStatus`). Nothing checked that
   * the component was still there, so an import in flight when the card
   * unmounts sets state on a dead tree.
   *
   * FOUND, not theorised: it surfaced as `ReferenceError: window is not
   * defined` thrown from React's `dispatchSetState` during a large test batch
   * — an Unhandled Rejection landing AFTER the jsdom environment had been torn
   * down. The file passes 16/16 on its own, which is exactly why it had never
   * been seen: it needs the unmount to beat the promise, and only load makes
   * that likely. In the app the same race is a user navigating away from a
   * slow import.
   *
   * A ref, not a cancellation: the import SHOULD finish (its rows are written
   * and wanted); only the reporting of it is pointless once nobody is looking.
   */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Pre-fill username from saved preferences
  useEffect(() => {
    if (activeProfile) {
      const saved = activeTab === 'chesscom'
        ? activeProfile.preferences.chessComUsername
        : activeProfile.preferences.lichessUsername;
      setUsername(saved ?? '');
    }
  }, [activeTab, activeProfile]);

  const handleProgress = useCallback((count: number, status?: string) => {
    if (!mountedRef.current) return;
    setProgressCount(count);
    if (status) setProgressStatus(status);
  }, []);

  const handleImport = useCallback(async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || importing) return;

    setImporting(true);
    setError(null);
    setResult(null);
    setProgressCount(0);
    setProgressStatus('Starting import...');

    try {
      // Import games
      const gameCount = activeTab === 'chesscom'
        ? await importChessComGames(trimmedUsername, handleProgress)
        : await importLichessGames(trimmedUsername, handleProgress);

      // Import stats (ratings, W/L/D)
      setProgressStatus('Fetching player stats...');
      let stats: PlatformStats | null = null;
      try {
        stats = activeTab === 'chesscom'
          ? await importChessComStats(trimmedUsername)
          : await importLichessStats(trimmedUsername);
      } catch {
        // Stats fetch is best-effort; don't fail the whole import
      }

      // Same guard: this lands after the network + Dexie work. `onImportComplete`
      // is the PARENT's business and still fires — the import really did happen
      // and whoever owns that callback may need to know, mounted or not.
      if (mountedRef.current) setResult({ gameCount, stats });
      onImportComplete(gameCount);

      // Save username + update profile
      if (activeProfile) {
        const prefKey = activeTab === 'chesscom' ? 'chessComUsername' : 'lichessUsername';
        const updates: Partial<UserProfile> = {
          preferences: { ...activeProfile.preferences, [prefKey]: trimmedUsername },
        };

        // Update profile rating from imported stats
        if (stats) {
          const primaryRating = getPrimaryRating(stats);
          if (primaryRating) {
            updates.currentRating = primaryRating;
          }
          if (stats.puzzleRating) {
            updates.puzzleRating = stats.puzzleRating;
          }
        }

        await db.profiles.update(activeProfile.id, updates);

        // Refresh active profile
        const refreshed = await db.profiles.get(activeProfile.id);
        if (refreshed) {
          setActiveProfile(refreshed);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed. Check the username and try again.';
      if (mountedRef.current) setError(message);
    } finally {
      if (mountedRef.current) {
        setImporting(false);
        setProgressStatus('');
      }
    }
  }, [username, importing, activeTab, activeProfile, setActiveProfile, onImportComplete, handleProgress]);

  return (
    <motion.div
      className="rounded-xl border p-6"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="game-import-card"
    >
      {/* Platform tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--color-bg)' }}>
        {(['chesscom', 'lichess'] as const).map((platform) => (
          <button
            key={platform}
            onClick={() => {
              setActiveTab(platform);
              setError(null);
              setResult(null);
            }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === platform ? 'text-white' : ''
            }`}
            style={activeTab === platform
              ? { background: 'var(--color-accent)', color: 'white' }
              : { color: 'var(--color-text-muted)' }
            }
            data-testid={`tab-${platform}`}
          >
            {PLATFORM_LABELS[platform]}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Download size={24} style={{ color: 'var(--color-accent)' }} />
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
          Connect Your {PLATFORM_LABELS[activeTab]} Account
        </h3>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Import your games and stats to get personalized coaching insights
      </p>

      {/* Username input */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleImport();
          }}
          placeholder={`${PLATFORM_LABELS[activeTab]} username`}
          disabled={importing}
          className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-theme-accent disabled:opacity-50"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
          data-testid="import-username-input"
        />
        <button
          onClick={() => void handleImport()}
          disabled={importing || !username.trim()}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2"
          style={{ background: 'var(--color-accent)' }}
          data-testid="import-btn"
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing...
            </>
          ) : (
            'Import'
          )}
        </button>
      </div>

      {/* Progress indicator */}
      {importing && (
        <motion.div
          className="mb-3 p-3 rounded-lg"
          style={{ background: 'var(--color-bg)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-testid="import-progress"
        >
          <div className="flex items-center gap-2 mb-1">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {progressStatus}
            </span>
          </div>
          {progressCount > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {progressCount} game{progressCount !== 1 ? 's' : ''} imported so far...
            </span>
          )}
        </motion.div>
      )}

      {/* Success message */}
      {result && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Game count */}
          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.1)' }}
            data-testid="import-success"
          >
            <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
            <span className="text-sm" style={{ color: 'var(--color-success)' }}>
              {result.gameCount === 0
                ? 'No new games to import — you\'re up to date!'
                : `Imported ${result.gameCount} game${result.gameCount !== 1 ? 's' : ''}!`
              }
            </span>
          </div>

          {/* Stats summary */}
          {result.stats && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.1)' }}
              data-testid="import-stats"
            >
              <TrendingUp size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
              <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text)' }}>
                <div className="font-medium">Player stats updated:</div>
                {result.stats.rapid && (
                  <div>
                    Rapid: <strong>{result.stats.rapid.rating}</strong>
                    {' '}({result.stats.rapid.wins}W / {result.stats.rapid.losses}L / {result.stats.rapid.draws}D)
                  </div>
                )}
                {result.stats.blitz && (
                  <div>
                    Blitz: <strong>{result.stats.blitz.rating}</strong>
                    {' '}({result.stats.blitz.wins}W / {result.stats.blitz.losses}L / {result.stats.blitz.draws}D)
                  </div>
                )}
                {result.stats.bullet && (
                  <div>
                    Bullet: <strong>{result.stats.bullet.rating}</strong>
                    {' '}({result.stats.bullet.wins}W / {result.stats.bullet.losses}L / {result.stats.bullet.draws}D)
                  </div>
                )}
                {result.stats.puzzleRating && (
                  <div>
                    Puzzles: <strong>{result.stats.puzzleRating}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          className="flex items-center gap-2 p-3 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-testid="import-error"
        >
          <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
          <span className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
