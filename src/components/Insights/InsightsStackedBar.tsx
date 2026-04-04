interface StackedSegment {
  label: string;
  value: number;
  color: string;
}

interface InsightsStackedBarProps {
  segments: StackedSegment[];
}

export function InsightsStackedBar({ segments }: InsightsStackedBarProps): JSX.Element {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="py-2.5" data-testid="stacked-bar">
      <div className="flex h-2.5 rounded-full overflow-hidden">
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div
              key={i}
              style={{ width: `${pct}%`, background: seg.color }}
              className="h-full"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: seg.color }} />
            {seg.label}
            <span className="font-semibold" style={{ color: 'var(--color-text-secondary, var(--color-text-muted))' }}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
