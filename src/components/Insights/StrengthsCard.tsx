interface StrengthsCardProps {
  strengths: string[];
}

export function StrengthsCard({ strengths }: StrengthsCardProps): JSX.Element | null {
  if (strengths.length === 0) return null;

  return (
    <div
      className="mt-5 rounded-xl p-3.5 border"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
        background: 'color-mix(in srgb, var(--color-success) 3%, var(--color-surface))',
      }}
      data-testid="strengths-card"
    >
      <h4
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: 'var(--color-success)' }}
      >
        Strengths
      </h4>
      {strengths.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 text-xs py-0.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="font-bold text-[11px]" style={{ color: 'var(--color-success)' }}>✓</span>
          {s}
        </div>
      ))}
    </div>
  );
}
