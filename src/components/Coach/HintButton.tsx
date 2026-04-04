import { Lightbulb } from 'lucide-react';
import type { HintLevel } from '../../types';

interface HintButtonProps {
  currentLevel: HintLevel;
  onRequestHint: () => void;
  disabled?: boolean;
  maxLevel?: HintLevel;
}

const LEVEL_LABELS: Record<HintLevel, string> = {
  0: 'Get a Hint',
  1: 'Show Nudge',
  2: 'Show Move',
  3: 'Hints Used',
};

const LEVEL_COLORS: Record<HintLevel, string> = {
  0: 'text-yellow-500 border-yellow-500/30',
  1: 'text-orange-500 border-orange-500/30',
  2: 'text-red-500 border-red-500/30',
  3: 'text-theme-text-muted border-theme-border',
};

export function HintButton({
  currentLevel,
  onRequestHint,
  disabled,
  maxLevel = 3,
}: HintButtonProps): JSX.Element {
  const isMaxed = currentLevel >= maxLevel;

  return (
    <button
      onClick={onRequestHint}
      disabled={disabled || isMaxed}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95 disabled:opacity-50 ${LEVEL_COLORS[currentLevel]}`}
      data-testid="hint-button"
      data-level={currentLevel}
    >
      <Lightbulb size={16} />
      <span>{LEVEL_LABELS[currentLevel]}</span>
      {/* Level dots */}
      <div className="flex gap-1 ml-1">
        {([1, 2, 3] as const).map((level) => (
          <span
            key={level}
            className={`w-1.5 h-1.5 rounded-full ${
              level <= currentLevel ? 'bg-current' : 'bg-theme-border'
            }`}
          />
        ))}
      </div>
    </button>
  );
}
