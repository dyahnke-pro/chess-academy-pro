import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerCoachNavigate,
  clearCoachNavigate,
  coachNavigate,
  coachSetBoardPosition,
  coachCanActuate,
} from './coachActuator';

describe('coachActuator', () => {
  beforeEach(() => { clearCoachNavigate(); });

  it('cannot actuate before a navigator is registered', () => {
    expect(coachCanActuate()).toBe(false);
    expect(coachNavigate('/openings')).toEqual({ ok: false, reason: 'navigation unavailable on this surface' });
  });

  it('navigates through the registered function and reports ok', () => {
    const nav = vi.fn();
    registerCoachNavigate(nav);
    expect(coachCanActuate()).toBe(true);
    expect(coachNavigate('/tactics')).toEqual({ ok: true });
    expect(nav).toHaveBeenCalledWith('/tactics');
  });

  it('empty path fails honestly', () => {
    registerCoachNavigate(vi.fn());
    expect(coachNavigate('  ').ok).toBe(false);
  });

  it('sets up a position by navigating to /coach/play with the encoded FEN', () => {
    const nav = vi.fn();
    registerCoachNavigate(nav);
    const fen = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
    expect(coachSetBoardPosition(fen)).toEqual({ ok: true });
    expect(nav).toHaveBeenCalledWith(`/coach/play?fen=${encodeURIComponent(fen)}`);
  });

  it('set-position fails (never fake success) when no navigator is registered', () => {
    expect(coachSetBoardPosition('8/8/8/8/8/8/8/K6k w - - 0 1').ok).toBe(false);
  });

  it('set-position with an empty fen fails', () => {
    registerCoachNavigate(vi.fn());
    expect(coachSetBoardPosition('').ok).toBe(false);
  });

  it('a throwing navigator surfaces as {ok:false}, not a crash', () => {
    registerCoachNavigate(() => { throw new Error('router unmounted'); });
    const r = coachNavigate('/openings');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/router unmounted/);
  });

  it('clearCoachNavigate revokes actuation', () => {
    registerCoachNavigate(vi.fn());
    clearCoachNavigate();
    expect(coachCanActuate()).toBe(false);
    expect(coachNavigate('/openings').ok).toBe(false);
  });
});
