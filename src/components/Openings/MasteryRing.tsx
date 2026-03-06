import { motion } from 'framer-motion';

interface MasteryRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MasteryRing({
  percent,
  size = 44,
  strokeWidth = 3.5,
  className = '',
}: MasteryRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 80
      ? 'var(--color-success, #22c55e)'
      : percent >= 50
        ? 'var(--color-warning, #eab308)'
        : percent > 0
          ? 'var(--color-error, #ef4444)'
          : 'var(--color-border, #333)';

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border, #333)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress arc */}
        {percent > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
      </svg>
      <span
        className="absolute text-xs font-bold"
        style={{ color }}
        data-testid="mastery-percent"
      >
        {percent}
      </span>
    </div>
  );
}
