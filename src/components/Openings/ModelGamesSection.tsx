import { useState, useEffect } from 'react';
import { Trophy, PlayCircle } from 'lucide-react';
import { getModelGamesForOpening } from '../../services/modelGameService';
import type { ModelGame } from '../../types';

interface ModelGamesSectionProps {
  openingId: string;
  onSelectGame: (game: ModelGame) => void;
}

export function ModelGamesSection({
  openingId,
  onSelectGame,
}: ModelGamesSectionProps): JSX.Element {
  const [games, setGames] = useState<ModelGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getModelGamesForOpening(openingId).then((result) => {
      if (!cancelled) {
        setGames(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [openingId]);

  if (loading || games.length === 0) return <div data-testid="model-games-empty" />;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="model-games-section">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-purple-500" />
        <h3 className="text-sm font-semibold text-theme-text">
          Model Games ({games.length})
        </h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        Study classic games to see the opening ideas in action.
      </p>
      <div className="space-y-2">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-border/50 transition-colors text-left"
            data-testid={`model-game-card-${game.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-theme-text">
                  {game.white} vs {game.black}
                </span>
                <span className="text-xs text-theme-text-muted">
                  {game.result}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted mt-0.5">
                {game.event}, {game.year}
              </p>
              <p className="text-xs text-theme-text-muted/70 mt-0.5 truncate">
                {game.middlegameTheme}
              </p>
            </div>
            <div className="shrink-0">
              <PlayCircle size={20} className="text-theme-accent" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
