import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { getMasterclassOpenings } from '../../services/openingService';
import { OpeningCard } from './OpeningCard';
import type { OpeningRecord } from '../../types';

// Masterclasses, split into White / Black tabs (David 2026-05-25). Each tab
// shows ONLY the masterclass openings for the side the student plays — the
// White tab can never show a black opening and vice versa (strict
// `o.color === color` filter; `color` is the exhaustive 'white' | 'black'
// union). The list comes from `opening-manifests.json` so a new opening
// appears automatically once it has a manifest entry — no second wiring step.

interface MasterclassesTabProps {
  color: 'white' | 'black';
}

export function MasterclassesTab({ color }: MasterclassesTabProps): JSX.Element {
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

  const shown = openings.filter((o) => o.color === color);

  if (shown.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-theme-text-muted">
        No {color} masterclasses available yet.
      </div>
    );
  }

  return (
    <div data-testid={`tab-${color}`}>
      <div className="mb-4 flex items-center gap-2 text-xs text-theme-text-muted">
        <GraduationCap size={14} className="text-amber-400" />
        <span>
          Full-depth {color} openings: hand-authored Watch / Learn / Practice /
          Play across every variation, weapons, plans, and model games.
        </span>
      </div>
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
    </div>
  );
}
