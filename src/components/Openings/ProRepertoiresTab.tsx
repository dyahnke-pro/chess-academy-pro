import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPlayers } from '../../services/proRepertoireService';
import { ProPlayerCard } from './ProPlayerCard';
import { ProAttributionNotice } from './ProAttributionNotice';
import proRepertoireData from '../../data/pro-repertoires.json';

interface ProOpeningEntry {
  playerId: string;
}

export function ProRepertoiresTab(): JSX.Element {
  const navigate = useNavigate();
  const players = useMemo(() => getPlayers(), []);

  const openingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const opening of (proRepertoireData as { openings: ProOpeningEntry[] }).openings) {
      counts[opening.playerId] = (counts[opening.playerId] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className="space-y-2" data-testid="pro-repertoires-tab">
      <ProAttributionNotice className="px-1 pb-1" />
      {/* Standard: every player behind a player card, no featured/front-and-center. */}
      {players.map((player, i) => (
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
  );
}
