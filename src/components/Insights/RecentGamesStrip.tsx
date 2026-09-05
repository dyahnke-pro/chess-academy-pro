import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { db } from '../../db/schema';
import type { GameRecord } from '../../types';
import { EnhancedGameCard } from './EnhancedGameCard';

/** How many games the strip shows before handing off to the full list. */
export const RECENT_GAMES_LIMIT = 5;

interface RecentGamesStripProps {
  /** Any value whose change should re-read the list (library size, analysis
   *  running → finished). The strip is otherwise a one-shot read. */
  refreshKey?: string;
}

/**
 * The player's most recent games, at the top of the Weaknesses overview
 * (David 2026-09-05: "I don't see a list of most recent games under the main
 * page of weaknesses. That needs to be somewhere more visible!").
 *
 * Newest first, master/model games excluded, each card tapping into the game's
 * review. "See all" opens the unfiltered games list. Renders nothing while
 * loading or when the library is empty — the page's own empty state owns that.
 */
export function RecentGamesStrip({ refreshKey = '' }: RecentGamesStripProps): JSX.Element | null {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const [recent, profile] = await Promise.all([
          db.games.orderBy('date').reverse().filter((g) => !g.isMasterGame).limit(RECENT_GAMES_LIMIT).toArray(),
          db.profiles.toCollection().first(),
        ]);
        if (cancelled) return;
        setGames(recent);
        setUsername(
          profile?.preferences.chessComUsername
            ?? profile?.preferences.lichessUsername
            ?? profile?.name
            ?? null,
        );
      } catch {
        if (!cancelled) setGames([]);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!games || games.length === 0) return null;

  return (
    <section className="mb-4" data-testid="recent-games-strip" aria-label="Recent games">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent games</h2>
        <button
          type="button"
          onClick={() => void navigate('/weaknesses/games')}
          className="inline-flex items-center gap-0.5 text-xs font-semibold hover:opacity-80"
          style={{ color: 'var(--color-accent)' }}
          data-testid="recent-games-see-all"
        >
          See all
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      {games.map((g) => (
        <EnhancedGameCard key={g.id} game={g} username={username} />
      ))}
    </section>
  );
}
