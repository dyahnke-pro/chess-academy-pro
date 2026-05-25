import { useState, useEffect } from 'react';
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

export function MasterclassesTab(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getMasterclassOpenings().then((data) => {
      setOpenings(data);
      setLoading(false);
    });
  }, []);

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

  const whiteOpenings = openings.filter((o) => o.color === 'white');
  const blackOpenings = openings.filter((o) => o.color === 'black');

  return (
    <div data-testid="tab-masterclasses">
      <div className="mb-4 flex items-center gap-2 text-xs text-theme-text-muted">
        <GraduationCap size={14} className="text-amber-400" />
        <span>
          Full-depth openings: hand-authored Watch / Learn / Practice / Play across
          every variation, weapons, plans, and model games.
        </span>
      </div>

      {whiteOpenings.length > 0 && (
        <>
          <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white border border-theme-border" />
            White Openings
          </h2>
          <div className="space-y-2 mb-5">
            {whiteOpenings.map((opening, i) => (
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
        </>
      )}

      {blackOpenings.length > 0 && (
        <>
          <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-neutral-800 border border-theme-border" />
            Black Openings
          </h2>
          <div className="space-y-2">
            {blackOpenings.map((opening, i) => (
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
        </>
      )}
    </div>
  );
}
