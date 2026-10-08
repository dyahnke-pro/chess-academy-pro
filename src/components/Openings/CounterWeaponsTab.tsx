import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { getAntiOpenings } from '../../services/openingService';
import { OpeningShelf } from './OpeningShelf';
import type { OpeningRecord } from '../../types';

// Counter-Weapons tab (David 2026-07-07: "move the counter openings to their own
// tab under openings"). Surfaces the White anti-opening repertoires — the lines
// you play to beat the defenses amateurs struggle to face (Anti-Sicilian
// Rossolimo, Anti-Caro Fantasy, Anti-Pirc Austrian, the 150 vs the Modern, …).
// This was the one Academy shelf without a home in the explorer; it now lives
// here so removing the Academy course shelves loses nothing. The list comes from
// `getAntiOpenings()` (anti-openings.json, seeded into db.openings), so a new
// anti-opening appears here automatically — no second wiring step.

export function CounterWeaponsTab(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    // Anti-openings seed in the DEFERRED backfill, so on a cold first load they
    // aren't in Dexie yet at mount. Re-poll until they land (or give up after
    // ~40s) so the shelf appears without a manual reload.
    const fetchAll = async (): Promise<void> => {
      const data = await getAntiOpenings();
      if (!alive) return;
      setOpenings(data);
      setLoading(false);
      if (data.length === 0 && tries < 20) {
        tries += 1;
        setTimeout(() => { void fetchAll(); }, 2000);
      }
    };
    void fetchAll();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading counter-weapons...</p>
      </div>
    );
  }

  if (openings.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-theme-text-muted">
        No counter-weapons available yet.
      </div>
    );
  }

  return (
    <div data-testid="tab-counter">
      <div className="mb-4 flex items-center gap-2 text-xs text-theme-text-muted">
        <Swords size={14} className="text-sky-400" />
        <span>
          Anti-opening repertoires — ready-made answers to the systems amateurs
          struggle to face, each with Watch / Learn / Practice / Play.
        </span>
      </div>

      <OpeningShelf openings={openings} onOpen={(o) => void navigate(`/openings/${o.id}`)} />
    </div>
  );
}
