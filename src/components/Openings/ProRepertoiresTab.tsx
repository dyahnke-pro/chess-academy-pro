import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getPlayersWithRepertoire,
  getOpeningCountsByPlayer,
} from '../../services/proRepertoireService';
import { ProPlayerCard } from './ProPlayerCard';

export function ProRepertoiresTab(): JSX.Element {
  const navigate = useNavigate();
  // Only pros with at least one built opening — names-only pros with
  // incomplete (empty) repertoires are hidden. See
  // getPlayersWithRepertoire in proRepertoireService.
  const players = useMemo(() => getPlayersWithRepertoire(), []);

  const openingCounts = useMemo(() => getOpeningCountsByPlayer(), []);

  return (
    <div className="space-y-2" data-testid="pro-repertoires-tab">
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
