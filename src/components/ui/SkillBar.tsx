interface SkillBarProps {
  label: string;
  value: number;
}

export function SkillBar({ label, value }: SkillBarProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm capitalize w-24 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${value}%`, background: 'var(--color-accent)' }}
        />
      </div>
      <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
        {value}
      </span>
    </div>
  );
}
