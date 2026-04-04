import { PieChart, Pie, ResponsiveContainer } from 'recharts';

interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface InsightsDonutChartProps {
  data: DonutSegment[];
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function InsightsDonutChart({
  data,
  size = 100,
  innerRadius = 30,
  outerRadius = 44,
  centerLabel,
  centerValue,
}: InsightsDonutChartProps): JSX.Element {
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="donut-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.map((d) => ({ ...d, fill: d.color }))}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
