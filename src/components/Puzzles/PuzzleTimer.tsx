import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface PuzzleTimerProps {
  duration: number; // seconds
  running: boolean;
  onTimeout: () => void;
}

export function PuzzleTimer({ duration, running, onTimeout }: PuzzleTimerProps): JSX.Element {
  const [remaining, setRemaining] = useState(duration);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset when duration changes (new puzzle)
  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (!running || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimeoutRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, remaining]);

  const fraction = duration > 0 ? remaining / duration : 0;
  const isUrgent = remaining <= 10;

  return (
    <div className="flex items-center gap-2" data-testid="puzzle-timer" role="timer" aria-label={`${remaining} seconds remaining`}>
      <Clock size={16} className={isUrgent ? '' : 'text-theme-text-muted'} style={isUrgent ? { color: 'var(--color-error)' } : undefined} />
      <span
        className="text-sm font-mono font-semibold"
        style={{ color: isUrgent ? 'var(--color-error)' : 'var(--color-text)' }}
        data-testid="timer-display"
      >
        {remaining}s
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-theme-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${fraction * 100}%`, background: isUrgent ? 'var(--color-error)' : 'var(--color-accent)' }}
          data-testid="timer-bar"
        />
      </div>
    </div>
  );
}
