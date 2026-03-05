import { Lock } from 'lucide-react';
import { CoachAvatar } from './CoachAvatar';
import type { CoachPersonality } from '../../types';

interface CoachCardProps {
  personality: CoachPersonality;
  name: string;
  tagline: string;
  style: string;
  unlocked: boolean;
  requiredLevel: number;
  selected: boolean;
  onSelect: () => void;
}

export function CoachCard({
  personality,
  name,
  tagline,
  style,
  unlocked,
  requiredLevel,
  selected,
  onSelect,
}: CoachCardProps): JSX.Element {
  return (
    <button
      onClick={unlocked ? onSelect : undefined}
      disabled={!unlocked}
      className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all w-full ${
        selected
          ? 'border-theme-accent bg-theme-accent/10 shadow-lg'
          : unlocked
            ? 'border-theme-border bg-theme-surface hover:bg-theme-border hover:border-theme-accent/50 cursor-pointer'
            : 'border-theme-border bg-theme-surface/50 opacity-60 cursor-not-allowed'
      }`}
      data-testid={`coach-card-${personality}`}
    >
      {!unlocked && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-theme-text-muted">
          <Lock size={14} />
          <span className="text-xs font-medium">Level {requiredLevel}</span>
        </div>
      )}

      <CoachAvatar
        personality={personality}
        expression="neutral"
        speaking={false}
        size="lg"
      />

      <div className="text-center">
        <h3 className="text-lg font-bold text-theme-text">{name}</h3>
        <p className="text-sm text-theme-accent font-medium">{tagline}</p>
        <p className="text-xs text-theme-text-muted mt-1">{style}</p>
      </div>
    </button>
  );
}
