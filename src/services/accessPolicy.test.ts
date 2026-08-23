import { describe, it, expect } from 'vitest';
import { resolveAccess, type AccessInput } from './accessPolicy';
import { KID_FREE_MS } from './freeTierService';

const FRESH: AccessInput['freeTier'] = {
  puzzlesSolved: 0,
  freeOpeningId: null,
  kidFirstAccessAt: null,
  coachSpendUsd: 0,
};

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
  it('allows BROWSING a second masterclass opening page even after one is claimed', () => {
    // The page (browse + model games) stays free for every main-tab opening;
    // the one-free-opening limit is enforced in-page at the WLPP deep-dive tap
    // (OpeningDetailPage), not at the route (David 2026-07-14). So a second
    // opening's PAGE is `allow`, not `wall`.
    const d = decide('/openings/caro-kann', { freeTier: { ...FRESH, freeOpeningId: 'italian-game' } });
    expect(d.decision).toBe('allow');
  });
  it('allows a masterclass gambit that lives in the main tab (unclaimed)', () => {
    // kings-gambit / evans-gambit are IN the main opening tab → eligible.
    expect(decide('/openings/kings-gambit').decision).toBe('allow');
  });
  it('allows browsing a Gambits-tab course, pro-reps, and SRS (route never walls navigation)', () => {
    // The in-page deep-dive claim (OpeningDetailPage / canViewOpening) is the
    // only real gate left — these route-level checks just prove nothing walls
    // on mere navigation (David 2026-08-09).
    expect(decide('/openings/smith-morra-gambit').decision).toBe('allow');
    expect(decide('/openings/scotch-gambit').decision).toBe('allow');
    expect(decide('/openings/pro/naroditsky/caro-kann').decision).toBe('allow');
    expect(decide('/openings/srs').decision).toBe('allow');
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

describe('accessPolicy — coach free tier ($1 DeepSeek token-cost, lifetime)', () => {
  it.each(['/coach/play', '/coach/teach', '/coach/home'])('meters %s with a fresh budget', (p) => {
    expect(decide(p)).toEqual({ decision: 'meter', feature: 'coach' });
  });
  it('meters coach while spend is below $1', () => {
    expect(decide('/coach/teach', { freeTier: { ...FRESH, coachSpendUsd: 0.5 } })).toEqual({
      decision: 'meter',
      feature: 'coach',
    });
    expect(decide('/coach/teach', { freeTier: { ...FRESH, coachSpendUsd: 0.99 } })).toEqual({
      decision: 'meter',
      feature: 'coach',
    });
  });
  it('walls coach once spend reaches $1', () => {
    expect(decide('/coach/teach', { freeTier: { ...FRESH, coachSpendUsd: 1 } })).toEqual({
      decision: 'wall',
      feature: 'coach',
    });
    expect(decide('/coach/play', { freeTier: { ...FRESH, coachSpendUsd: 2.5 } })).toEqual({
      decision: 'wall',
      feature: 'coach',
    });
  });
});

describe('accessPolicy — academy is open (route gate matches resolveCourseAccess)', () => {
  it.each(['/academy', '/academy/course/x'])('allows %s', (p) => {
    expect(decide(p)).toEqual({ decision: 'allow' });
  });
});
