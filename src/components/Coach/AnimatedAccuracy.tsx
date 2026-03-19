import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { getAccuracyColor } from './classificationStyles';

interface AnimatedAccuracyProps {
  accuracy: number;
  label?: string;
  className?: string;
}

export function AnimatedAccuracy({
  accuracy,
  label = 'Accuracy',
  className = '',
}: AnimatedAccuracyProps): JSX.Element {
  const clampedAccuracy = Math.max(0, Math.min(100, accuracy));
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(springValue, (v) => Math.round(v));
  const [displayNum, setDisplayNum] = useState(0);
  const color = getAccuracyColor(clampedAccuracy);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!hasAnimated.current) {
      springValue.set(clampedAccuracy);
      hasAnimated.current = true;
    }
  }, [clampedAccuracy, springValue]);

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => {
      setDisplayNum(v as number);
    });
    return unsubscribe;
  }, [displayValue]);

  return (
    <motion.div
      className={`flex flex-col items-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      data-testid="hero-accuracy"
    >
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-5xl font-bold tabular-nums"
          style={{ color }}
          data-testid="accuracy-value"
        >
          {displayNum}
        </span>
        <span
          className="text-2xl font-semibold"
          style={{ color }}
        >
          %
        </span>
      </div>
      <span
        className="text-xs uppercase tracking-wider mt-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
    </motion.div>
  );
}
