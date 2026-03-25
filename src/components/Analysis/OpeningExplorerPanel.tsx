import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Cloud, BookOpen } from 'lucide-react';
import {
  fetchLichessExplorer,
  fetchCloudEval,
  formatCloudEval,
} from '../../services/lichessExplorerService';
import { getOpeningByEco } from '../../services/openingService';
import type { LichessExplorerResult, LichessCloudEval, OpeningRecord } from '../../types';
import type { ExplorerSource } from '../../services/lichessExplorerService';

interface OpeningExplorerPanelProps {
  fen: string;
}

export function OpeningExplorerPanel({ fen }: OpeningExplorerPanelProps): JSX.Element {
  const navigate = useNavigate();
  const [source, setSource] = useState<ExplorerSource>('lichess');
  const [explorer, setExplorer] = useState<LichessExplorerResult | null>(null);
  const [cloudEval, setCloudEval] = useState<LichessCloudEval | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [repertoireMatch, setRepertoireMatch] = useState<OpeningRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setExplorer(null);
    setExplorerError(null);
    setExplorerLoading(true);
    setRepertoireMatch(null);

    fetchLichessExplorer(fen, source)
      .then((result) => {
        if (!cancelled) {
          setExplorer(result);
          // Check if the detected opening is in our repertoire
          if (result.opening?.eco) {
            void getOpeningByEco(result.opening.eco).then((matches) => {
              if (!cancelled) {
                const repertoire = matches.find((m) => m.isRepertoire);
                setRepertoireMatch(repertoire ?? null);
              }
            });
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setExplorerError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setExplorerLoading(false);
      });

    return () => { cancelled = true; };
  }, [fen, source]);

  useEffect(() => {
    let cancelled = false;
    setCloudEval(null);
    setCloudLoading(true);

    fetchCloudEval(fen)
      .then((result) => {
        if (!cancelled) setCloudEval(result);
      })
      .catch(() => {
        // Cloud eval is best-effort — fail silently
      })
      .finally(() => {
        if (!cancelled) setCloudLoading(false);
      });

    return () => { cancelled = true; };
  }, [fen]);

  const totalGames = explorer ? explorer.white + explorer.draws + explorer.black : 0;

  return (
    <div className="space-y-3" data-testid="opening-explorer-panel">
      {/* Source tabs */}
      <div className="flex gap-1 rounded-lg p-1 bg-theme-bg-secondary">
        {(['lichess', 'masters'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: source === s ? 'var(--color-surface)' : 'transparent',
              color: source === s ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
            data-testid={`explorer-source-${s}`}
          >
            {s === 'lichess' ? 'Lichess' : 'Masters'}
          </button>
        ))}
      </div>

      {/* Cloud eval */}
      {(cloudEval || cloudLoading) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border" data-testid="cloud-eval">
          <Cloud size={13} className="text-theme-accent shrink-0" />
          {cloudLoading ? (
            <Loader2 size={13} className="animate-spin text-theme-text-muted" />
          ) : cloudEval ? (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-theme-text-muted">Cloud</span>
              <span className="font-mono font-bold text-theme-text">
                {formatCloudEval(cloudEval.pvs[0] ?? {})}
              </span>
              <span className="text-theme-text-muted">d{cloudEval.depth}</span>
              {cloudEval.pvs[0]?.moves && (
                <span className="text-theme-text font-mono truncate max-w-[120px]">
                  {cloudEval.pvs[0].moves.split(' ').slice(0, 5).join(' ')}
                </span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Explorer content */}
      {explorerLoading && (
        <div className="flex items-center justify-center py-6" data-testid="explorer-loading">
          <Loader2 size={20} className="animate-spin text-theme-text-muted" />
        </div>
      )}

      {explorerError && (
        <p className="text-xs text-center py-4 text-red-500" data-testid="explorer-error">
          {explorerError}
        </p>
      )}

      {explorer && !explorerLoading && (
        <div className="space-y-2">
          {/* Opening name + total games */}
          {explorer.opening && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-theme-text-muted">
                <span className="font-medium text-theme-text">{explorer.opening.name}</span>
                {' · '}
                {explorer.opening.eco}
              </div>
              {repertoireMatch && (
                <button
                  onClick={() => void navigate(`/openings/${repertoireMatch.id}`)}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                  data-testid="repertoire-match-badge"
                >
                  <BookOpen size={10} />
                  In your repertoire
                </button>
              )}
            </div>
          )}
          {totalGames > 0 && (
            <div className="text-xs text-theme-text-muted">
              {totalGames.toLocaleString()} games
            </div>
          )}

          {/* Move list */}
          {explorer.moves.length === 0 ? (
            <p className="text-xs text-theme-text-muted py-2 text-center" data-testid="no-explorer-data">
              No data for this position
            </p>
          ) : (
            <div className="space-y-1" data-testid="explorer-moves">
              {/* Header */}
              <div className="grid grid-cols-[2rem_1fr_5rem_4rem] gap-1 text-xs text-theme-text-muted pb-1 border-b border-theme-border">
                <span></span>
                <span>W / D / L</span>
                <span className="text-right">Games</span>
                <span className="text-right">Avg ±</span>
              </div>
              {explorer.moves.slice(0, 12).map((move) => {
                const total = move.white + move.draws + move.black;
                const wPct = total > 0 ? (move.white / total) * 100 : 0;
                const dPct = total > 0 ? (move.draws / total) * 100 : 0;
                const bPct = total > 0 ? (move.black / total) * 100 : 0;

                return (
                  <div
                    key={move.uci}
                    className="grid grid-cols-[2rem_1fr_5rem_4rem] gap-1 items-center text-xs"
                    data-testid={`explorer-move-${move.san}`}
                  >
                    <span className="font-mono font-medium text-theme-text">{move.san}</span>
                    <div className="flex h-3 rounded overflow-hidden gap-px">
                      <div
                        className="bg-white/90"
                        style={{ width: `${wPct}%` }}
                        title={`White: ${wPct.toFixed(1)}%`}
                      />
                      <div
                        className="bg-gray-400"
                        style={{ width: `${dPct}%` }}
                        title={`Draw: ${dPct.toFixed(1)}%`}
                      />
                      <div
                        className="bg-gray-700"
                        style={{ width: `${bPct}%` }}
                        title={`Black: ${bPct.toFixed(1)}%`}
                      />
                    </div>
                    <span className="text-right text-theme-text-muted">
                      {total.toLocaleString()}
                    </span>
                    <span className="text-right text-theme-text-muted">
                      {move.averageRating > 0 ? move.averageRating : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
