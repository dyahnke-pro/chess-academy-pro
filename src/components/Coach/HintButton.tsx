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

const LEVEL_COLORS: Record<HintLevel, { className: string; rgb: string | null; glow: string; glowHover: string }> = {
  0: { className: 'text-yellow-500', rgb: '234, 179, 8', glow: '0 0 6px rgba(234, 179, 8, 0.5), 0 0 14px rgba(234, 179, 8, 0.3), 0 0 24px rgba(234, 179, 8, 0.15)', glowHover: '0 0 8px rgba(234, 179, 8, 0.7), 0 0 18px rgba(234, 179, 8, 0.45), 0 0 30px rgba(234, 179, 8, 0.25)' },
  1: { className: 'text-orange-500', rgb: '249, 115, 22', glow: '0 0 6px rgba(249, 115, 22, 0.5), 0 0 14px rgba(249, 115, 22, 0.3), 0 0 24px rgba(249, 115, 22, 0.15)', glowHover: '0 0 8px rgba(249, 115, 22, 0.7), 0 0 18px rgba(249, 115, 22, 0.45), 0 0 30px rgba(249, 115, 22, 0.25)' },
  2: { className: 'text-red-500', rgb: '239, 68, 68', glow: '0 0 6px rgba(239, 68, 68, 0.5), 0 0 14px rgba(239, 68, 68, 0.3), 0 0 24px rgba(239, 68, 68, 0.15)', glowHover: '0 0 8px rgba(239, 68, 68, 0.7), 0 0 18px rgba(239, 68, 68, 0.45), 0 0 30px rgba(239, 68, 68, 0.25)' },
  3: { className: 'text-theme-text-muted', rgb: null, glow: 'none', glowHover: 'none' },
};

export function HintButton({
  currentLevel,
  onRequestHint,
  disabled,
  maxLevel = 3,
}: HintButtonProps): JSX.Element {
  const isMaxed = currentLevel >= maxLevel;
  const levelStyle = LEVEL_COLORS[currentLevel];

  const rgb = levelStyle.rgb;

  return (
    <button
      onClick={onRequestHint}
      disabled={disabled || isMaxed}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${levelStyle.className}`}
      style={{
        borderTop: rgb ? `1px solid rgba(${rgb}, 0.1)` : '1px solid var(--color-border)',
        borderRight: rgb ? `1px solid rgba(${rgb}, 0.1)` : '1px solid var(--color-border)',
        borderLeft: rgb ? `2px solid rgba(${rgb}, 0.6)` : '2px solid var(--color-border)',
        borderBottom: rgb ? `2px solid rgba(${rgb}, 0.6)` : '2px solid var(--color-border)',
        boxShadow: levelStyle.glow,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (rgb) {
          el.style.borderLeft = `2px solid rgba(${rgb}, 0.85)`;
          el.style.borderBottom = `2px solid rgba(${rgb}, 0.85)`;
          el.style.borderTop = `1px solid rgba(${rgb}, 0.2)`;
          el.style.borderRight = `1px solid rgba(${rgb}, 0.2)`;
        }
        el.style.boxShadow = levelStyle.glowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (rgb) {
          el.style.borderLeft = `2px solid rgba(${rgb}, 0.6)`;
          el.style.borderBottom = `2px solid rgba(${rgb}, 0.6)`;
          el.style.borderTop = `1px solid rgba(${rgb}, 0.1)`;
          el.style.borderRight = `1px solid rgba(${rgb}, 0.1)`;
        }
        el.style.boxShadow = levelStyle.glow;
      }}
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
