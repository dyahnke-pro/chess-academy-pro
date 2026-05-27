import { useCallback, useEffect, useRef, useState } from 'react';
import type { Color } from 'chess.js';
import {
  type ClockState,
  type TimeControl,
  applyIncrement,
  initialClockState,
  isUnlimited,
  tickClock,
} from '../services/chessClock';

interface UseChessClockArgs {
  timeControl: TimeControl;
  turn: Color;
  running: boolean;
  onFlag: (flagged: Color) => void;
}

interface UseChessClockResult {
  clock: ClockState;
  enabled: boolean;
  recordMove: (moved: Color) => void;
  reset: () => void;
}

const TICK_MS = 100;

export function useChessClock({ timeControl, turn, running, onFlag }: UseChessClockArgs): UseChessClockResult {
  const enabled = !isUnlimited(timeControl);
  const [clock, setClock] = useState<ClockState>(() => initialClockState(timeControl));

  const onFlagRef = useRef(onFlag);
  onFlagRef.current = onFlag;
  const flaggedRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);

  const reset = useCallback((): void => {
    flaggedRef.current = false;
    lastTsRef.current = null;
    setClock(initialClockState(timeControl));
  }, [timeControl]);

  // Re-seed whenever the selected time control changes.
  useEffect(() => {
    reset();
  }, [reset]);

  const recordMove = useCallback((moved: Color): void => {
    if (!enabled) return;
    lastTsRef.current = null; // restart the elapsed window for the new mover
    setClock((prev) => applyIncrement(prev, moved, timeControl));
  }, [enabled, timeControl]);

  useEffect(() => {
    if (!enabled || !running || flaggedRef.current) {
      lastTsRef.current = null;
      return;
    }
    lastTsRef.current = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const last = lastTsRef.current ?? now;
      const elapsed = now - last;
      lastTsRef.current = now;
      setClock((prev) => {
        const { state, flagged } = tickClock(prev, turn, elapsed);
        if (flagged && !flaggedRef.current) {
          flaggedRef.current = true;
          onFlagRef.current(turn);
        }
        return state;
      });
    }, TICK_MS);
    return () => {
      window.clearInterval(interval);
      lastTsRef.current = null;
    };
  }, [enabled, running, turn]);

  return { clock, enabled, recordMove, reset };
}
