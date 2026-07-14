import { describe, it, expect } from 'vitest';
import { resolveAccess, type AccessInput } from './accessPolicy';
import { KID_FREE_MS } from './freeTierService';

const FRESH: AccessInput['freeTier'] = { puzzlesSolved: 0, freeOpeningId: null, kidFirstAccessAt: null };

function decide(pathname: string, over: Partial<AccessInput> = {}) {
  return resolveAccess({ pathname, isPro: false, gateEnabled: true, freeTier: FRESH, ...over });
}

describe('accessPolicy — dormant / Pro', () => {
  it('allows everything when the gate is off', () => {
    expect(resolveAccess({ pathname: '/coach/play', isPro: false, gateEnabled: false, freeTier: FRESH }).decision).toBe('allow');
    expect(resolveAccess({ pathname: '/openings/pro/naroditsky/x', isPro: false, gateEnabled: false, freeTier: FRESH }).decision).toBe('allow');
  });
  it('allows everything for a Pro user even when the gate is on', () => {
    expect(resolveAccess({ pathname: '/coach/play', isPro: true, gateEnabled: true, freeTier: FRESH }).decision).toBe('allow');
  });
});

describe('accessPolicy — free shell + surfaces', () => {
  it.each(['/', '/settings', '/settings/onboarding', '/games', '/games/import', '/weaknesses', '/weaknesses/games'])(
    'allows free surface %s',
    (p) => expect(decide(p).decision).toBe('allow'),
  );
});

describe('accessPolicy — openings', () => {
  it('lets the explorer list through free', () => {
    expect(decide('/openings').decision).toBe('allow');
  });
  it('allows the first eligible masterclass opening (unclaimed)', () => {
    expect(decide('/openings/italian-game').decision).toBe('allow');
  });
  it('allows the already-claimed opening again', () => {
    expect(decide('/openings/italian-game', { freeTier: { ...FRESH, freeOpeningId: 'italian-game' } }).decision).toBe('allow');
  });
  it('walls a SECOND, different opening once one is claimed', () => {
    const d = decide('/openings/caro-kann', { freeTier: { ...FRESH, freeOpeningId: 'italian-game' } });
    expect(d).toEqual({ decision: 'wall', feature: 'opening' });
  });
  it('allows a masterclass gambit that lives in the main tab (unclaimed)', () => {
    // kings-gambit / evans-gambit are IN the main opening tab → eligible.
    expect(decide('/openings/kings-gambit').decision).toBe('allow');
  });
  it('walls a Gambits-tab course (not in the main tab)', () => {
    expect(decide('/openings/smith-morra-gambit')).toEqual({ decision: 'wall', feature: 'opening' });
    expect(decide('/openings/scotch-gambit')).toEqual({ decision: 'wall', feature: 'opening' });
  });
  it('walls pro-reps and SRS', () => {
    expect(decide('/openings/pro/naroditsky/caro-kann')).toEqual({ decision: 'wall', feature: 'opening' });
    expect(decide('/openings/srs')).toEqual({ decision: 'wall', feature: 'opening' });
  });
});

describe('accessPolicy — puzzles meter', () => {
  it('meters tactics while the bucket has room', () => {
    expect(decide('/tactics/classic', { freeTier: { ...FRESH, puzzlesSolved: 19 } })).toEqual({ decision: 'meter', feature: 'puzzles' });
  });
  it('walls tactics once the 20-bucket is spent', () => {
    expect(decide('/tactics/classic', { freeTier: { ...FRESH, puzzlesSolved: 20 } })).toEqual({ decision: 'wall', feature: 'puzzles' });
    expect(decide('/tactics/weakness-drill', { freeTier: { ...FRESH, puzzlesSolved: 25 } })).toEqual({ decision: 'wall', feature: 'puzzles' });
  });
});

describe('accessPolicy — kid window', () => {
  it('allows kid mode before first access (unstarted)', () => {
    expect(decide('/kid').decision).toBe('allow');
    expect(decide('/kid/pawn-games').decision).toBe('allow');
  });
  it('allows kid mode within the 7-day window', () => {
    const now = 1_000_000_000_000;
    const started = now - (KID_FREE_MS - 60_000); // ~1 min left
    expect(decide('/kid/knight-games', { now, freeTier: { ...FRESH, kidFirstAccessAt: started } }).decision).toBe('allow');
  });
  it('walls kid mode after the 7-day window', () => {
    const now = 1_000_000_000_000;
    const started = now - (KID_FREE_MS + 60_000); // just expired
    expect(decide('/kid', { now, freeTier: { ...FRESH, kidFirstAccessAt: started } })).toEqual({ decision: 'wall', feature: 'kid' });
  });
});

describe('accessPolicy — walled premium', () => {
  it.each([
    ['/coach/play', 'coach'],
    ['/coach/teach', 'coach'],
    ['/coach/home', 'coach'],
    ['/academy', 'academy'],
    ['/academy/course/x', 'academy'],
  ])('walls %s as %s', (p, feature) => {
    expect(decide(p)).toEqual({ decision: 'wall', feature });
  });
});
