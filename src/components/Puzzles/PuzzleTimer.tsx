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

  const fraction = remaining / duration;
  const isUrgent = remaining <= 10;

  return (
    <div className="flex items-center gap-2" data-testid="puzzle-timer">
      <Clock size={16} className={isUrgent ? 'text-red-500' : 'text-theme-text-muted'} />
      <span
        className={`text-sm font-mono font-semibold ${isUrgent ? 'text-red-500' : 'text-theme-text'}`}
        data-testid="timer-display"
      >
        {remaining}s
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-theme-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-theme-accent'}`}
          style={{ width: `${fraction * 100}%` }}
          data-testid="timer-bar"
        />
      </div>
    </div>
  );
}
