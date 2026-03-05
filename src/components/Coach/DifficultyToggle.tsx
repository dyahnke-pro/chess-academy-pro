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

export function DifficultyToggle({
  value,
  onChange,
  disabled = false,
}: DifficultyToggleProps): JSX.Element {
  return (
    <div
      className="inline-flex rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
      data-testid="difficulty-toggle"
    >
      {LABELS.map(({ key, label }) => {
        const active = key === value;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            disabled={disabled}
            className="px-3 py-1 text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              background: active ? 'var(--color-accent)' : 'var(--color-surface)',
              color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
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
