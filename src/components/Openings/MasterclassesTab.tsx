import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { getMasterclassOpenings } from '../../services/openingService';
import { OpeningCard } from './OpeningCard';
import type { OpeningRecord } from '../../types';

// Masterclasses tab (David 2026-05-22). Shows the openings built to the full
// masterclass standard — hand-authored Watch/Learn/Practice/Play across the
// main line + every first-class variation, named-trap weapons, middlegame
// plans with playable lead-the-eye lines, model games per variation, and
// §5b-grounded narration. The list comes from `opening-manifests.json` so
// when a new opening lands and gets a manifest entry, it appears here
// automatically — no second wiring step.
//
// David 2026-05-25: split into White / Black color sub-tabs, each opening
// filed by its repertoire `color`. Data-driven, so a new class auto-files
// itself; a colour sub-tab self-hides when it has no classes.

type ColorTab = 'white' | 'black';

export function MasterclassesTab(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorTab, setColorTab] = useState<ColorTab>('white');

  useEffect(() => {
    void getMasterclassOpenings().then((data) => {
      setOpenings(data);
      setLoading(false);
    });
  }, []);

  const byColor = useMemo(() => ({
    white: openings.filter((o) => o.color === 'white'),
    black: openings.filter((o) => o.color === 'black'),
  }), [openings]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading masterclasses...</p>
      </div>
    );
  }

  if (openings.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-theme-text-muted">
        No masterclasses available yet.
      </div>
    );
  }

  const shown = byColor[colorTab];

  return (
    <div data-testid="tab-masterclasses">
      <div className="mb-4 flex items-center gap-2 text-xs text-theme-text-muted">
        <GraduationCap size={14} className="text-amber-400" />
        <span>
          Full-depth openings: hand-authored Watch / Learn / Practice / Play across
          every variation, weapons, plans, and model games.
        </span>
      </div>

      {/* White / Black color sub-tabs */}
      <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-theme-surface rounded-xl" data-testid="masterclass-color-toggle">
        {([
          { id: 'white' as const, label: 'White', dot: 'bg-white border border-theme-border' },
          { id: 'black' as const, label: 'Black', dot: 'bg-neutral-800 border border-theme-border' },
        ]).map(({ id, label, dot }) => (
          <button
            key={id}
            onClick={() => setColorTab(id)}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              colorTab === id
                ? 'bg-amber-500/25 text-amber-200'
                : 'text-theme-text-muted hover:text-theme-text'
            }`}
            data-testid={`masterclass-color-${id}`}
          >
            <span className={`w-3 h-3 rounded-full ${dot}`} />
            {label} ({byColor[id].length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-theme-text-muted">
          No {colorTab} masterclasses yet.
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((opening, i) => (
            <motion.div
              key={opening.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <OpeningCard
                opening={opening}
                onClick={() => void navigate(`/openings/${opening.id}`)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
