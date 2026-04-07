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

const LEVEL_COLORS: Record<HintLevel, { className: string; glow: string; glowHover: string }> = {
  0: { className: 'text-yellow-500 border-yellow-500/30', glow: '0 0 10px rgba(234, 179, 8, 0.25), 0 0 3px rgba(234, 179, 8, 0.15)', glowHover: '0 0 18px rgba(234, 179, 8, 0.45), 0 0 6px rgba(234, 179, 8, 0.25)' },
  1: { className: 'text-orange-500 border-orange-500/30', glow: '0 0 10px rgba(249, 115, 22, 0.25), 0 0 3px rgba(249, 115, 22, 0.15)', glowHover: '0 0 18px rgba(249, 115, 22, 0.45), 0 0 6px rgba(249, 115, 22, 0.25)' },
  2: { className: 'text-red-500 border-red-500/30', glow: '0 0 10px rgba(239, 68, 68, 0.25), 0 0 3px rgba(239, 68, 68, 0.15)', glowHover: '0 0 18px rgba(239, 68, 68, 0.45), 0 0 6px rgba(239, 68, 68, 0.25)' },
  3: { className: 'text-theme-text-muted border-theme-border', glow: 'none', glowHover: 'none' },
};

export function HintButton({
  currentLevel,
  onRequestHint,
  disabled,
  maxLevel = 3,
}: HintButtonProps): JSX.Element {
  const isMaxed = currentLevel >= maxLevel;
  const levelStyle = LEVEL_COLORS[currentLevel];

  return (
    <button
      onClick={onRequestHint}
      disabled={disabled || isMaxed}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${levelStyle.className}`}
      style={{ boxShadow: levelStyle.glow }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = levelStyle.glowHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = levelStyle.glow; }}
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
