import { Zap, Target, Flame } from 'lucide-react';
import type { AdaptiveDifficulty } from '../../services/adaptivePuzzleService';
import { DIFFICULTY_LABELS } from '../../services/adaptivePuzzleService';

interface DifficultySelectorProps {
  onSelect: (difficulty: AdaptiveDifficulty) => void;
}

const ICONS: Record<AdaptiveDifficulty, React.ComponentType<{ size?: number; className?: string }>> = {
  easy: Zap,
  medium: Target,
  hard: Flame,
};

const COLORS: Record<AdaptiveDifficulty, { bg: string; border: string; icon: string }> = {
  easy: {
    bg: 'hover:bg-green-500/10',
    border: 'border-green-500/30 hover:border-green-500/60',
    icon: 'text-green-500',
  },
  medium: {
    bg: 'hover:bg-amber-500/10',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    icon: 'text-amber-500',
  },
  hard: {
    bg: 'hover:bg-red-500/10',
    border: 'border-red-500/30 hover:border-red-500/60',
    icon: 'text-red-500',
  },
};

const DIFFICULTIES: AdaptiveDifficulty[] = ['easy', 'medium', 'hard'];

export function DifficultySelector({ onSelect }: DifficultySelectorProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="difficulty-selector">
      {DIFFICULTIES.map((diff) => {
        const info = DIFFICULTY_LABELS[diff];
        const colors = COLORS[diff];
        const Icon = ICONS[diff];

        return (
          <button
            key={diff}
            onClick={() => onSelect(diff)}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 ${colors.border} ${colors.bg} bg-theme-surface transition-all`}
            data-testid={`difficulty-${diff}`}
          >
            <Icon size={32} className={colors.icon} />
            <div className="text-center">
              <h3 className="text-lg font-bold text-theme-text">{info.label}</h3>
              <p className="text-xs text-theme-text-muted mt-1">{info.ratingRange} rating</p>
              <p className="text-xs text-theme-text-muted mt-2">{info.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
