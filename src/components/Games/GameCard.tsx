import type { GameRecord } from '../../types';

interface GameCardProps {
  game: GameRecord;
  onClick: () => void;
}

export function GameCard({ game, onClick }: GameCardProps): JSX.Element {
  const resultColor =
    game.result === '1-0' ? 'var(--color-success)' :
    game.result === '0-1' ? 'var(--color-error)' :
    'var(--color-text-muted)';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 border hover:opacity-80 transition-opacity"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid={`game-card-${game.id}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">{game.white} vs {game.black}</span>
        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ color: resultColor }}>
          {game.result}
        </span>
      </div>
      <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {game.eco && <span>{game.eco}</span>}
        <span>{game.date}</span>
        <span className="capitalize">{game.source}</span>
        {game.whiteElo && <span>{game.whiteElo}</span>}
      </div>
    </button>
  );
}
