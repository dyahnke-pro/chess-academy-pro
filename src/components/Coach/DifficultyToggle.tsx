import type { CoachDifficulty } from '../../types';

interface DifficultyToggleProps {
  value: CoachDifficulty;
  onChange: (difficulty: CoachDifficulty) => void;
  disabled?: boolean;
}

const LABELS: { key: CoachDifficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const NEON_COLORS: Record<CoachDifficulty, { border: string; glow: string; activeGlow: string; activeBg: string }> = {
  easy: { border: 'rgba(52, 211, 153, 0.4)', glow: '0 0 8px rgba(52, 211, 153, 0.2)', activeGlow: '0 0 14px rgba(52, 211, 153, 0.5), 0 0 4px rgba(52, 211, 153, 0.25)', activeBg: 'rgba(52, 211, 153, 0.9)' },
  medium: { border: 'rgba(245, 158, 11, 0.4)', glow: '0 0 8px rgba(245, 158, 11, 0.2)', activeGlow: '0 0 14px rgba(245, 158, 11, 0.5), 0 0 4px rgba(245, 158, 11, 0.25)', activeBg: 'rgba(245, 158, 11, 0.9)' },
  hard: { border: 'rgba(239, 68, 68, 0.4)', glow: '0 0 8px rgba(239, 68, 68, 0.2)', activeGlow: '0 0 14px rgba(239, 68, 68, 0.5), 0 0 4px rgba(239, 68, 68, 0.25)', activeBg: 'rgba(239, 68, 68, 0.9)' },
};

export function DifficultyToggle({
  value,
  onChange,
  disabled = false,
}: DifficultyToggleProps): JSX.Element {
  const neon = NEON_COLORS[value];
  return (
    <div
      className="inline-flex rounded-lg border-2 overflow-hidden transition-all duration-200"
      style={{ borderColor: neon.border, boxShadow: neon.glow }}
      data-testid="difficulty-toggle"
    >
      {LABELS.map(({ key, label }) => {
        const active = key === value;
        const n = NEON_COLORS[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            disabled={disabled}
            className="px-3 py-1 text-sm font-medium transition-all duration-200 disabled:opacity-40"
            style={{
              background: active ? n.activeBg : 'var(--color-surface)',
              color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
              boxShadow: active ? n.activeGlow : 'none',
            }}
            aria-pressed={active}
            data-testid={`difficulty-${key}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
