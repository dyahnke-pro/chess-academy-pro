import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GUIDED_GAMES } from '../../data/guidedGames';
import { StarDisplay } from './StarDisplay';
import type { GuidedGameDifficulty } from '../../types';

const DIFFICULTY_LABELS: Record<GuidedGameDifficulty, { label: string; icon: string; color: string }> = {
  1: { label: 'Beginner', icon: '🌱', color: '#22c55e' },
  2: { label: 'Explorer', icon: '⭐', color: '#f59e0b' },
  3: { label: 'Champion', icon: '🏆', color: '#ef4444' },
};

export function GuidedGameHubPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto" data-testid="guided-game-hub">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate('/kid')}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
          data-testid="guided-hub-back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl font-bold">Play a Game</h2>
      </div>

      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Walk through famous chess games move by move. The coach will guide you through each move!
      </p>

      {/* Game cards */}
      <div className="flex flex-col gap-3">
        {GUIDED_GAMES.map((game) => {
          const diff = DIFFICULTY_LABELS[game.difficulty];
          const milestones = game.moves.filter((m) => m.isMilestone).length;

          return (
            <button
              key={game.id}
              onClick={() => void navigate(`/kid/play-games/${game.id}`)}
              className="rounded-xl p-5 border-2 flex items-start gap-4 hover:opacity-80 transition-opacity w-full text-left"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-accent)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
              }}
              data-testid={`guided-game-card-${game.id}`}
            >
              <span className="text-3xl mt-1">{diff.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg">{game.title}</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {game.description}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: diff.color, color: 'white' }}
                  >
                    {diff.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    ~{game.estimatedMinutes} min
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {game.playerColor === 'w' ? 'Play White' : 'Play Black'}
                  </span>
                </div>
                <div className="mt-2">
                  <StarDisplay earned={0} total={milestones} size="sm" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
