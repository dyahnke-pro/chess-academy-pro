import { getAccuracyColor } from './classificationStyles';

interface AccuracyRingProps {
  accuracy: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function AccuracyRing({
  accuracy,
  size = 80,
  strokeWidth = 4,
  label,
  className = '',
}: AccuracyRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * Math.min(accuracy, 100)) / 100;
  const ringColor = getAccuracyColor(accuracy);

  return (
    <div className={`relative flex-shrink-0 ${className}`} data-testid="accuracy-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Accuracy ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          data-testid="accuracy-ring-fill"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold"
          style={{
            color: 'var(--color-text)',
            fontSize: `${size * 0.225}px`,
            lineHeight: 1.2,
          }}
        >
          {Math.round(accuracy)}
        </span>
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: `${Math.max(8, size * 0.12)}px`,
            lineHeight: 1,
          }}
        >
          {label ?? 'Accuracy'}
        </span>
      </div>
    </div>
  );
}
