import { useEffect, useState } from 'react';
import { ChessBoard } from '../Board/ChessBoard';
import { getRepertoireOpenings } from '../../services/openingService';
import { seedDatabase } from '../../services/dataLoader';
import type { OpeningRecord } from '../../types';

export function BoardTestPage(): JSX.Element {
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        await seedDatabase();
        const all = await getRepertoireOpenings();
        setOpenings(all);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const whites = openings.filter((o) => o.color === 'white');
  const blacks = openings.filter((o) => o.color === 'black');

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text p-6 space-y-8">
      <h1 className="text-3xl font-bold">🧪 Board Test Page</h1>

      {/* ── WO-02: Interactive Chess Board ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-theme-accent">WO-02 — Interactive Chess Board</h2>
        <p className="text-sm text-theme-text-muted">
          Drag pieces to move · Click to select · Flip / Undo / Reset buttons visible
        </p>
        <div className="max-w-md">
          <ChessBoard
            showFlipButton
            showUndoButton
            showResetButton
            showEvalBar
            evaluation={0.3}
          />
        </div>
      </section>

      {/* ── WO-03: Opening Database ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-theme-accent">WO-03 — Opening Database</h2>

        {loading && <p className="text-theme-text-muted">Loading database…</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!loading && !error && (
          <>
            <div className="flex gap-6 text-sm">
              <span className="px-3 py-1 rounded-full bg-theme-accent/20 text-theme-accent font-medium">
                {openings.length} repertoire openings loaded
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-theme-text-muted">
                {whites.length} White · {blacks.length} Black
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* White openings */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base">White Openings ({whites.length})</h3>
                <ul className="space-y-1">
                  {whites.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5 text-sm"
                    >
                      <span>
                        <span className="font-mono text-theme-accent mr-2">{o.eco}</span>
                        {o.name}
                      </span>
                      <span className="text-xs text-theme-text-muted">{o.style}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Black openings */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base">Black Openings ({blacks.length})</h3>
                <ul className="space-y-1">
                  {blacks.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5 text-sm"
                    >
                      <span>
                        <span className="font-mono text-theme-accent mr-2">{o.eco}</span>
                        {o.name}
                      </span>
                      <span className="text-xs text-theme-text-muted">{o.style}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sample opening detail */}
            {openings[0] && (
              <div className="bg-white/5 rounded-lg p-4 space-y-2 max-w-xl">
                <h3 className="font-semibold">Sample — {openings[0].name}</h3>
                <p className="text-sm text-theme-text-muted">{openings[0].overview}</p>
                {openings[0].keyIdeas && (
                  <ul className="list-disc list-inside text-sm space-y-0.5">
                    {openings[0].keyIdeas.map((idea, i) => (
                      <li key={i}>{idea}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
