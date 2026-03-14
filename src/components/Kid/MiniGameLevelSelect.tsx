import { Lock } from 'lucide-react';
import { StarDisplay } from './StarDisplay';
import type { MiniGameLevelConfig, MiniGameProgress } from '../../types';
import { isLevelUnlocked } from '../../services/miniGameService';

interface MiniGameLevelSelectProps {
  config: MiniGameLevelConfig;
  progress: MiniGameProgress | null;
  onSelect: (level: number) => void;
}

export function MiniGameLevelSelect({
  config,
  progress,
  onSelect,
}: MiniGameLevelSelectProps): JSX.Element {
  const unlocked = isLevelUnlocked(progress, config.level);
  const levelProgress = progress?.levels[config.level];
  const stars = levelProgress?.stars ?? 0;

  return (
    <button
      onClick={() => unlocked && onSelect(config.level)}
      disabled={!unlocked}
      className={`rounded-xl p-4 border flex items-center gap-3 w-full text-left transition-opacity ${
        unlocked ? 'hover:opacity-80' : 'opacity-50 cursor-not-allowed'
      }`}
      style={{
        background: 'var(--color-surface)',
        borderColor: unlocked ? 'var(--color-accent)' : 'var(--color-border)',
      }}
      data-testid={`level-select-${config.level}`}
    >
      {/* Level number */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
        style={{
          background: unlocked ? 'var(--color-accent)' : 'var(--color-border)',
          color: unlocked ? 'var(--color-bg)' : 'var(--color-text-muted)',
        }}
      >
        {unlocked ? config.level : <Lock size={16} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{config.title}</div>
        <div
          className="text-xs truncate"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {config.description}
        </div>
      </div>

      {/* Stars */}
      {levelProgress?.completed && (
        <StarDisplay earned={stars} total={3} size="sm" />
      )}
    </button>
  );
}
