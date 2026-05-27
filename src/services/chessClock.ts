import type { Color } from 'chess.js';

export interface TimeControl {
  id: string;
  label: string;
  initialMs: number;
  incrementMs: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'unlimited', label: 'Unlimited', initialMs: 0, incrementMs: 0 },
  { id: 'rapid-15-10', label: '15 | 10', initialMs: 15 * 60_000, incrementMs: 10_000 },
  { id: 'rapid-10-0', label: '10 min', initialMs: 10 * 60_000, incrementMs: 0 },
  { id: 'blitz-5-0', label: '5 min', initialMs: 5 * 60_000, incrementMs: 0 },
  { id: 'blitz-3-2', label: '3 | 2', initialMs: 3 * 60_000, incrementMs: 2_000 },
];

export const DEFAULT_TIME_CONTROL_ID = 'unlimited';

export function isUnlimited(tc: TimeControl): boolean {
  return tc.initialMs <= 0;
}

export function getTimeControlById(id: string | undefined | null): TimeControl {
  return TIME_CONTROLS.find((tc) => tc.id === id) ?? TIME_CONTROLS[0];
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
}

export function initialClockState(tc: TimeControl): ClockState {
  return { whiteMs: tc.initialMs, blackMs: tc.initialMs };
}

/**
 * Subtract `elapsedMs` from the side to move. Never goes below 0. Returns the
 * next state plus whether the moving side flagged (hit 0). Pure — the hook owns
 * the wall-clock deltas so this stays unit-testable.
 */
export function tickClock(state: ClockState, turn: Color, elapsedMs: number): { state: ClockState; flagged: boolean } {
  if (turn === 'w') {
    const whiteMs = Math.max(0, state.whiteMs - elapsedMs);
    return { state: { ...state, whiteMs }, flagged: whiteMs <= 0 };
  }
  const blackMs = Math.max(0, state.blackMs - elapsedMs);
  return { state: { ...state, blackMs }, flagged: blackMs <= 0 };
}

/** Add the Fischer increment to the side that just completed a move. */
export function applyIncrement(state: ClockState, moved: Color, tc: TimeControl): ClockState {
  if (tc.incrementMs <= 0) return state;
  return moved === 'w'
    ? { ...state, whiteMs: state.whiteMs + tc.incrementMs }
    : { ...state, blackMs: state.blackMs + tc.incrementMs };
}

/** mm:ss while >= 20s, s.t (tenths) under 20s to signal urgency. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped >= 20_000) {
    const totalSec = Math.floor(clamped / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
  const tenths = Math.floor(clamped / 100) / 10;
  return tenths.toFixed(1);
}
