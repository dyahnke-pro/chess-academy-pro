import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPlayers, getPlayerById, getPlayerOpenings } from '../../services/proRepertoireService';
import { toggleFavorite } from '../../services/openingService';
import { ProPlayerCard } from './ProPlayerCard';
import { OpeningCard } from './OpeningCard';
import proRepertoireData from '../../data/pro-repertoires.json';
import type { OpeningRecord } from '../../types';

interface ProOpeningEntry {
  playerId: string;
}

// The player pinned to the top of the list, surfaced as his openings
// directly (not behind a player-card click). Factual attribution only —
// no course branding / product names.
const FEATURED_PLAYER_ID = 'gothamchess';

// Most-played-down ordering (from his chess.com game volume) so the
// openings he relies on lead. Ids not listed sort after, by name.
const FEATURED_ORDER: string[] = [
  'pro-gothamchess-caro-kann',
  'pro-gothamchess-trompowsky',
  'pro-gothamchess-english',
  'pro-gothamchess-french-defense',
  'pro-gothamchess-scandinavian',
  'pro-gothamchess-vienna',
  'pro-gothamchess-kia',
  'pro-gothamchess-caro-advance-white',
  'pro-gothamchess-pirc-defense',
  'pro-gothamchess-closed-sicilian',
  'pro-gothamchess-london',
  'pro-gothamchess-qgd',
];

function byFeaturedOrder(a: OpeningRecord, b: OpeningRecord): number {
  const ia = FEATURED_ORDER.indexOf(a.id);
  const ib = FEATURED_ORDER.indexOf(b.id);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.name.localeCompare(b.name);
}

export function ProRepertoiresTab(): JSX.Element {
  const navigate = useNavigate();
  const players = useMemo(() => getPlayers(), []);
  const featured = useMemo(() => getPlayerById(FEATURED_PLAYER_ID), []);

  const [featuredOpenings, setFeaturedOpenings] = useState<OpeningRecord[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getPlayerOpenings(FEATURED_PLAYER_ID).then((result) => {
      if (!active) return;
      setFeaturedOpenings(result);
      setFeaturedLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleFavorite = useCallback(async (id: string): Promise<void> => {
    const newVal = await toggleFavorite(id);
    setFeaturedOpenings((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isFavorite: newVal } : o)),
    );
  }, []);

  const openingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opening of (proRepertoireData as { openings: ProOpeningEntry[] }).openings) {
      counts[opening.playerId] = (counts[opening.playerId] ?? 0) + 1;
    }
    return counts;
  }, []);

  const whites = useMemo(
    () => featuredOpenings.filter((o) => o.color === 'white').sort(byFeaturedOrder),
    [featuredOpenings],
  );
  const blacks = useMemo(
    () => featuredOpenings.filter((o) => o.color === 'black').sort(byFeaturedOrder),
    [featuredOpenings],
  );

  // Other players keep the player-card entry point, below the featured set.
  const otherPlayers = useMemo(
    () => players.filter((p) => p.id !== FEATURED_PLAYER_ID),
    [players],
  );

  const openFeatured = (opening: OpeningRecord): void => {
    void navigate(`/openings/pro/${FEATURED_PLAYER_ID}/${opening.id}`);
  };

  return (
    <div className="space-y-6" data-testid="pro-repertoires-tab">
      {/* ─── Featured player's openings, pinned to top ──────────────────── */}
      {featured && (
        <section data-testid="featured-pro-openings">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-theme-accent/15 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-theme-accent">{featured.imageInitials}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-theme-text leading-tight">{featured.name}</h2>
              <p className="text-xs text-theme-text-muted">
                {featured.title} · {featured.style}
              </p>
            </div>
          </div>

          {featuredLoading && (
            <p className="text-sm text-theme-text-muted py-3" data-testid="featured-loading">
              Loading repertoire…
            </p>
          )}

          {!featuredLoading && featuredOpenings.length === 0 && (
            <p className="text-sm text-theme-text-muted py-3" data-testid="featured-empty">
              Repertoire is still loading on this device — check back in a moment.
            </p>
          )}

          {whites.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2">
                As White
              </h3>
              <div className="space-y-1.5">
                {whites.map((opening, i) => (
                  <motion.div
                    key={opening.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <OpeningCard
                      opening={opening}
                      onClick={() => openFeatured(opening)}
                      onToggleFavorite={() => void handleToggleFavorite(opening.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {blacks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2">
                As Black
              </h3>
              <div className="space-y-1.5">
                {blacks.map((opening, i) => (
                  <motion.div
                    key={opening.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <OpeningCard
                      opening={opening}
                      onClick={() => openFeatured(opening)}
                      onToggleFavorite={() => void handleToggleFavorite(opening.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Other players ─────────────────────────────────────────────── */}
      {otherPlayers.length > 0 && (
        <section data-testid="other-pro-players">
          <h3 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
            More players
          </h3>
          <div className="space-y-2">
            {otherPlayers.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <ProPlayerCard
                  player={player}
                  openingCount={openingCounts[player.id] ?? 0}
                  onClick={() => void navigate(`/openings/pro/${player.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
