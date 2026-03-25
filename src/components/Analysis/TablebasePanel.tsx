import { useState, useEffect } from 'react';
import { Loader2, Database } from 'lucide-react';
import {
  fetchTablebase,
  countPieces,
  formatTablebaseVerdict,
  type TablebaseResult,
} from '../../services/tablebases';

interface TablebasePanelProps {
  fen: string;
}

export function TablebasePanel({ fen }: TablebasePanelProps): JSX.Element {
  const [result, setResult] = useState<TablebaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pieceCount = countPieces(fen);
  const isSupported = pieceCount <= 7;
  const sideToMove = (fen.split(' ')[1] ?? 'w') as 'w' | 'b';

  useEffect(() => {
    if (!isSupported) {
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setResult(null);
    setError(null);
    setLoading(true);

    fetchTablebase(fen)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Tablebase unavailable');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fen, isSupported]);

  if (!isSupported) {
    return (
      <div className="space-y-2" data-testid="tablebase-panel">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <Database size={14} />
          <span>Tablebase requires ≤7 pieces ({pieceCount} currently)</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-text-muted)' }} data-testid="tablebase-loading">
        <Loader2 size={14} className="animate-spin" />
        <span>Looking up tablebase...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-500 py-2" data-testid="tablebase-error">{error}</p>
    );
  }

  if (!result) return <></>;

  const verdict = formatTablebaseVerdict(result, sideToMove);
  const verdictColor = result.category === 'win'
    ? 'var(--color-success)'
    : result.category === 'loss'
      ? 'var(--color-error)'
      : 'var(--color-text-muted)';

  const bestMoves = result.moves
    .filter((m) => m.category === (result.category === 'win' ? 'loss' : 'win'))
    .slice(0, 5);

  return (
    <div className="space-y-3" data-testid="tablebase-panel">
      {/* Verdict banner */}
      <div
        className="rounded-lg px-4 py-3 text-sm font-semibold"
        style={{ background: 'var(--color-surface)', color: verdictColor, border: `1px solid ${verdictColor}` }}
        data-testid="tablebase-verdict"
      >
        {verdict}
      </div>

      {/* Best moves */}
      {bestMoves.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Best Moves
          </div>
          {result.moves.slice(0, 8).map((move) => {
            const moveCat = move.category;
            const moveColor = moveCat === 'win'
              ? 'var(--color-success)'
              : moveCat === 'loss'
                ? 'var(--color-error)'
                : 'var(--color-text-muted)';

            return (
              <div
                key={move.uci}
                className="flex items-center gap-3 text-xs"
                data-testid={`tb-move-${move.san}`}
              >
                <span className="font-mono font-bold w-10" style={{ color: 'var(--color-text)' }}>
                  {move.san}
                </span>
                <span className="font-mono text-xs w-16" style={{ color: moveColor }}>
                  {moveCat === 'win' ? 'WIN' : moveCat === 'loss' ? 'LOSS' : moveCat === 'draw' ? 'DRAW' : moveCat.toUpperCase()}
                </span>
                {move.dtm !== null && (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    M{Math.abs(move.dtm)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Powered by <span className="font-medium">Lichess Syzygy Tablebase</span>
      </div>
    </div>
  );
}
