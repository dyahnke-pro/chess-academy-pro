import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGambitOpenings } from '../../services/openingService';
import { OpeningShelf } from './OpeningShelf';
import type { OpeningRecord } from '../../types';

export function GambitsTab(): JSX.Element {
  const navigate = useNavigate();
  const [gambits, setGambits] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getGambitOpenings().then((data) => {
      setGambits(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading gambits...</p>
      </div>
    );
  }

  if (gambits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-theme-text-muted">
        No gambits found.
      </div>
    );
  }

  return (
    <div data-testid="tab-gambits">
      <OpeningShelf openings={gambits} onOpen={(g) => void navigate(`/openings/${g.id}`)} />
    </div>
  );
}
