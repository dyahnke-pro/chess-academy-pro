import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * RollingNumber — a score that counts UP to its new value like an odometer
 * instead of jumping, so "+6" lands as a run of ticks. Reduced motion: jumps.
 */
export function RollingNumber({ value, className, testId }: { value: number; className?: string; testId?: string }): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || value <= from.current) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    const dur = Math.min(900, 120 * (value - start));
    let raf = 0;
    const step = (t: number): void => {
      const k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(start + (value - start) * k));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, reduced]);

  return <span className={className} data-testid={testId} data-value={value}>{shown}</span>;
}
