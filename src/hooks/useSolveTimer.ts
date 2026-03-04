import { useState, useEffect, useRef, useCallback } from 'react';

export function useSolveTimer(): { elapsed: number; reset: () => void } {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  const reset = useCallback(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { elapsed, reset };
}
