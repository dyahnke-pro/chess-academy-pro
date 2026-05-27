import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_CONTROL_ID,
  TIME_CONTROLS,
  applyIncrement,
  formatClock,
  getTimeControlById,
  initialClockState,
  isUnlimited,
  tickClock,
} from './chessClock';

describe('chessClock', () => {
  const blitz = getTimeControlById('blitz-3-2');
  const unlimited = getTimeControlById('unlimited');

  it('defaults to unlimited and unlimited is detected', () => {
    expect(DEFAULT_TIME_CONTROL_ID).toBe('unlimited');
    expect(isUnlimited(unlimited)).toBe(true);
    expect(isUnlimited(blitz)).toBe(false);
  });

  it('getTimeControlById falls back to unlimited for unknown/empty ids', () => {
    expect(getTimeControlById('nope').id).toBe('unlimited');
    expect(getTimeControlById(undefined).id).toBe('unlimited');
    expect(getTimeControlById(null).id).toBe('unlimited');
  });

  it('seeds equal time for both sides', () => {
    const s = initialClockState(blitz);
    expect(s.whiteMs).toBe(180_000);
    expect(s.blackMs).toBe(180_000);
  });

  it('ticks only the side to move', () => {
    const s = initialClockState(blitz);
    const after = tickClock(s, 'w', 5_000);
    expect(after.state.whiteMs).toBe(175_000);
    expect(after.state.blackMs).toBe(180_000);
    expect(after.flagged).toBe(false);
  });

  it('flags when the moving side hits zero and never goes negative', () => {
    const s = { whiteMs: 800, blackMs: 180_000 };
    const after = tickClock(s, 'w', 5_000);
    expect(after.state.whiteMs).toBe(0);
    expect(after.flagged).toBe(true);
  });

  it('applies Fischer increment only to the side that moved, and only when configured', () => {
    const s = initialClockState(blitz);
    const afterWhite = applyIncrement(s, 'w', blitz);
    expect(afterWhite.whiteMs).toBe(182_000);
    expect(afterWhite.blackMs).toBe(180_000);

    const noInc = applyIncrement(s, 'w', getTimeControlById('blitz-5-0'));
    expect(noInc.whiteMs).toBe(180_000);
  });

  it('formats mm:ss above 20s and tenths below', () => {
    expect(formatClock(180_000)).toBe('3:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(20_000)).toBe('0:20');
    expect(formatClock(9_400)).toBe('9.4');
    expect(formatClock(0)).toBe('0.0');
    expect(formatClock(-50)).toBe('0.0');
  });

  it('ships a stable set of presets', () => {
    expect(TIME_CONTROLS.map((t) => t.id)).toEqual([
      'unlimited',
      'rapid-15-10',
      'rapid-10-0',
      'blitz-5-0',
      'blitz-3-2',
    ]);
  });
});
