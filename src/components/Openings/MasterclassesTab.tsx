import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { getMasterclassOpenings } from '../../services/openingService';
import { OpeningShelf } from './OpeningShelf';
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

  return (
    <div data-testid="tab-masterclasses">
      <div className="mb-4 flex items-center gap-2 text-xs text-theme-text-muted">
        <GraduationCap size={14} className="text-amber-400" />
        <span>
          Full-depth openings: hand-authored Watch / Learn / Practice / Play across
          every variation, weapons, plans, and model games.
        </span>
      </div>

      <OpeningShelf openings={openings} onOpen={(o) => void navigate(`/openings/${o.id}`)} />
    </div>
  );
}
