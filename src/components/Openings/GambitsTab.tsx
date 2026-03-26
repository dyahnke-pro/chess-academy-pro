import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGambitOpenings } from '../../services/openingService';
import { OpeningCard } from './OpeningCard';
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

  const whites = gambits.filter((g) => g.color === 'white');
  const blacks = gambits.filter((g) => g.color === 'black');

  return (
    <div data-testid="tab-gambits">
      {whites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
            White Gambits
          </h2>
          <div className="space-y-2">
            {whites.map((gambit, i) => (
              <motion.div
                key={gambit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <OpeningCard
                  opening={gambit}
                  onClick={() => void navigate(`/openings/${gambit.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {blacks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
            Black Gambits
          </h2>
          <div className="space-y-2">
            {blacks.map((gambit, i) => (
              <motion.div
                key={gambit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <OpeningCard
                  opening={gambit}
                  onClick={() => void navigate(`/openings/${gambit.id}`)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {gambits.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-theme-text-muted">
          No gambits found.
        </div>
      )}
    </div>
  );
}
