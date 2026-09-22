import { useCallback, useEffect, useState } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { clearHomeOpening, getHomeOpeningRankings, getHomeOpenings, setHomeOpening, type HomeOpenings } from '../../services/homeOpeningService';
import { HOME_OPENING_MIN_GAMES, type HomeOpeningRanking } from '../../services/homeOpening';
import type { PlayerColor } from '../../services/playerIdentity';

// THE HOME OPENINGS CARD (WO-HOME-OPENING-01 A3, David 2026-09-22). One home
// opening per colour, read off the record: the family the student PLAYS MOST
// that clears the floor, with its games and score. It is a LOCK with a one-tap
// change (PLAN decision): "Change" lists the ranked candidates and a tap makes
// that family the student's own choice, which no recompute overwrites; "Use
// my most played" hands it back to the computer. Under the floor the card
// says so in numbers rather than crowning a 3-game line.

const COLOURS: readonly PlayerColor[] = ['white', 'black'];
const pct = (s: number): string => `${Math.round(s * 100)}%`;

export function HomeOpeningCard({ refreshKey = '' }: { refreshKey?: string }): JSX.Element | null {
  const [home, setHome] = useState<HomeOpenings | null>(null);
  const [rankings, setRankings] = useState<Record<PlayerColor, HomeOpeningRanking> | null>(null);
  const [open, setOpen] = useState<PlayerColor | null>(null);
  const [error, setError] = useState<boolean>(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [h, r] = await Promise.all([getHomeOpenings(), getHomeOpeningRankings()]);
      setHome(h);
      setRankings(r);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (error) {
    return (
      <div className="rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }} data-testid="home-opening-card-error">
        Could not read your openings — pull to refresh.
      </div>
    );
  }
  if (!home || !rankings) {
    return <div className="rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }} data-testid="home-opening-card-loading">Reading your openings…</div>;
  }
  // Nothing as either colour: the page's empty state owns the message.
  if (rankings.white.totalGames === 0 && rankings.black.totalGames === 0) return null;

  return (
    <div className="rounded-2xl border px-4 py-3 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }} data-testid="home-opening-card">
      <div className="flex items-center gap-2">
        <Home size={16} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Your home openings</span>
        <span className="text-[11px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>the coach works inside these first</span>
      </div>
      {COLOURS.map((colour) => {
        const choice = home[colour];
        const ranking = rankings[colour];
        const isOpen = open === colour;
        return (
          <div key={colour} className="flex flex-col gap-1" data-testid={`home-opening-${colour}`}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide w-12 shrink-0" style={{ color: 'var(--color-text-muted)' }}>{colour}</span>
              {choice ? (
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--color-text)' }} data-testid={`home-opening-${colour}-name`}>
                  <span className="font-medium">{choice.family}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}> · {choice.games} games · {pct(choice.score)}</span>
                  {choice.source === 'student' && <span className="ml-1 text-[10px] uppercase" style={{ color: 'var(--color-primary)' }}>your pick</span>}
                </span>
              ) : (
                <span className="text-xs flex-1" style={{ color: 'var(--color-text-muted)' }} data-testid={`home-opening-${colour}-none`}>
                  {ranking.totalGames === 0
                    ? `No games as ${colour} yet`
                    : `Not enough in one opening yet — ${HOME_OPENING_MIN_GAMES} games in a line makes it home (${ranking.totalGames} as ${colour} so far)`}
                </span>
              )}
              {ranking.candidates.length > 0 && (
                <button
                  onClick={() => setOpen(isOpen ? null : colour)}
                  className="text-[11px] px-2 py-1 rounded-lg border shrink-0"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  data-testid={`home-opening-change-${colour}`}
                >
                  {isOpen ? 'Close' : 'Change'}
                </button>
              )}
            </div>
            {isOpen && (
              <div className="flex flex-col gap-1 pl-14" data-testid={`home-opening-options-${colour}`}>
                {ranking.candidates.slice(0, 8).map((c) => (
                  <button
                    key={c.family}
                    onClick={() => { void setHomeOpening(colour, c.family).then(() => { setOpen(null); return load(); }); }}
                    className="text-left text-xs px-2 py-1.5 rounded-lg border flex items-center gap-2"
                    style={{ borderColor: c.family === choice?.family ? 'var(--color-primary)' : 'var(--color-border)', color: 'var(--color-text)' }}
                    data-testid={`home-opening-option-${colour}-${c.family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    <span className="flex-1 min-w-0 truncate">{c.family}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{c.games} · {pct(c.score)}{c.clearsFloor ? '' : ' · thin'}</span>
                  </button>
                ))}
                {choice?.source === 'student' && (
                  <button
                    onClick={() => { void clearHomeOpening(colour).then(() => { setOpen(null); return load(); }); }}
                    className="text-left text-xs px-2 py-1.5 rounded-lg flex items-center gap-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    data-testid={`home-opening-reset-${colour}`}
                  >
                    <RefreshCw size={12} /> Use my most played
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
