interface BarItem {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  suffix?: string;
}

interface InsightsBarChartProps {
  data: BarItem[];
  maxValue?: number;
}

export function InsightsBarChart({ data, maxValue: globalMax }: InsightsBarChartProps): JSX.Element {
  const max = globalMax ?? Math.max(...data.map((d) => d.maxValue ?? d.value), 1);

  return (
    <div className="flex flex-col gap-2.5 py-2.5" data-testid="bar-chart">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="text-xs w-[90px] shrink-0 truncate"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {item.label}
            </span>
            <div
              className="flex-1 h-2.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-secondary, var(--color-border))' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: item.color ?? 'var(--color-accent)',
                }}
              />
            </div>
            <span
              className="text-xs w-9 text-right shrink-0 font-semibold"
              style={{ color: item.color ?? 'var(--color-text-muted)' }}
            >
              {item.value}{item.suffix ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
