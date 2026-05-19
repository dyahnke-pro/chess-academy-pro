import { severityTokens, type Severity } from '../../services/severityScale';

interface BarItem {
  label: string;
  value: number;
  maxValue?: number;
  /** Bar fill color. Overridden by `severity` when set. */
  color?: string;
  suffix?: string;
  /** Click handler — when set, the row renders as a button. The user
   *  drills into the underlying data (David's "click anything → see
   *  the games" rule). */
  onClick?: () => void;
  /** Severity tier — drives bar color, the trailing icon, and the
   *  glow effect. When set, overrides `color`. */
  severity?: Severity;
  /** Stable identifier for data-testid. */
  testId?: string;
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
        const tokens = item.severity ? severityTokens(item.severity) : null;
        const barColor = tokens?.color ?? item.color ?? 'var(--color-accent)';
        const isClickable = !!item.onClick;
        // Compose the inner row content once so both <button> and <div>
        // variants render identically.
        const inner = (
          <>
            <span
              className="text-xs w-[90px] shrink-0 truncate text-left"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {item.label}
            </span>
            <div
              className="flex-1 h-2.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-secondary, var(--color-border))' }}
            >
              <div
                className={`h-full rounded-full transition-all ${tokens?.animationClass ?? ''}`}
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: barColor,
                  boxShadow: tokens?.glow ? tokens.glow : undefined,
                }}
              />
            </div>
            <span
              className="text-xs w-[52px] text-right shrink-0 font-semibold inline-flex items-center justify-end gap-1"
              style={{ color: barColor, textShadow: tokens?.glow ? tokens.glow : undefined }}
            >
              {tokens?.icon && (
                <span aria-label={tokens.ariaLabel} title={tokens.ariaLabel}>{tokens.icon}</span>
              )}
              <span>{item.value}{item.suffix ?? ''}</span>
              {isClickable && <span style={{ color: 'var(--color-text-muted)' }}>›</span>}
            </span>
          </>
        );
        if (isClickable) {
          return (
            <button
              key={i}
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-2.5 w-full hover:opacity-80 active:opacity-60 transition-opacity"
              data-testid={item.testId ?? 'bar-row-clickable'}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={i} className="flex items-center gap-2.5" data-testid={item.testId}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
