import { describe, it, expect } from 'vitest';
import { heatMap, newlyGreen } from './heatMap';
import { HELD_FOR_PROVEN, PROVEN_MIN_GAMES, type CapabilityProfile, type CapabilityProfileEntry } from './capabilityEvidence';

const entry = (o: Partial<CapabilityProfileEntry>): CapabilityProfileEntry => ({ held: 0, broken: 0, heldStreak: 0, streakGames: 0, ...o });

describe('heatMap', () => {
  it('a fresh student is ALL grey — never asked is never mastered', () => {
    const tiles = heatMap(new Map(), []);
    expect(tiles.length).toBeGreaterThan(20);
    expect(tiles.every((t) => t.state === 'grey' && t.progress === 0)).toBe(true);
    expect(tiles.some((t) => t.tag === 'other')).toBe(false);
  });

  it('green is the ONE proven bar — streak and games both', () => {
    const p: CapabilityProfile = new Map([
      ['hung-material', entry({ held: HELD_FOR_PROVEN, heldStreak: HELD_FOR_PROVEN, streakGames: PROVEN_MIN_GAMES })],
      ['missed-opponents-threat', entry({ held: HELD_FOR_PROVEN, heldStreak: HELD_FOR_PROVEN, streakGames: 1 })],
    ] as never);
    const t = heatMap(p, []);
    expect(t.find((x) => x.tag === 'hung-material')?.state).toBe('green');
    const half = t.find((x) => x.tag === 'missed-opponents-threat');
    expect(half?.state).toBe('grey');
    expect(half?.progress).toBeGreaterThan(0);
    expect(half?.progress).toBeLessThan(1);
  });

  it('red = an open hole, or a break with no held streak since', () => {
    const p: CapabilityProfile = new Map([
      ['missed-tactic', entry({ broken: 2, heldStreak: 0 })],
    ] as never);
    const t = heatMap(p, [{ capabilityTag: 'hung-material' as never, openCount: 3 }]);
    expect(t.find((x) => x.tag === 'missed-tactic')?.state).toBe('red');
    const hung = t.find((x) => x.tag === 'hung-material');
    expect(hung?.state).toBe('red');
    expect(hung?.openCount).toBe(3);
  });

  it('held once, never broken, not yet proven, is NOT failing — grey on its way', () => {
    const p: CapabilityProfile = new Map([['missed-tactic', entry({ held: 1, heldStreak: 1, streakGames: 1 })]] as never);
    expect(heatMap(p, []).find((x) => x.tag === 'missed-tactic')?.state).toBe('grey');
  });

  it('newlyGreen names only the tiles that crossed', () => {
    const p: CapabilityProfile = new Map([
      ['hung-material', entry({ held: 9, heldStreak: 9, streakGames: 3 })],
    ] as never);
    const tiles = heatMap(p, []);
    expect(newlyGreen(tiles, new Set()).map((t) => t.tag)).toEqual(['hung-material']);
    expect(newlyGreen(tiles, new Set(['hung-material']))).toEqual([]);
  });
});
