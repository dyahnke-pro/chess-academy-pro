import { describe, it, expect } from 'vitest';
import { heatMap, newlyGreen } from './heatMap';
import { HELD_FOR_PROVEN, PROVEN_MIN_GAMES, type CapabilityProfile, type CapabilityProfileEntry } from './capabilityEvidence';
import type { MisconceptionTagRecord } from '../types';
const slip = (tag: string, over: Partial<MisconceptionTagRecord> = {}): MisconceptionTagRecord => ({
  id: `s-${Math.random()}`, tag, source: 'auto-analysis', createdAt: 1, fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  status: 'open', masteryHits: 0, dueAt: 0, sourceGameId: 'g1', ...over,
});


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
    const t = heatMap(p, [slip('hung-material'), slip('hung-material'), slip('hung-material')]);
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

describe('knowLine — the lesson half of a tile', () => {
  const tile = (state: 'red' | 'green' | 'grey', held = 0, broken = 0) =>
    ({ tag: 'hung-material', label: 'x', state, openCount: 0, held, broken, heldStreak: 0, streakGames: 0, progress: 0 }) as const;
  it('names the gap when lessons prove it and games do not', async () => {
    const { knowLine } = await import('./heatMap');
    expect(knowLine(tile('green', 5), tile('red'))).toMatch(/In lessons: proven\. In your games it has not shown yet/);
    expect(knowLine(tile('green', 5), tile('green'))).toBe('In lessons: proven — and your games show it too.');
    expect(knowLine(tile('grey'), tile('red'))).toBe('In lessons: not asked yet.');
    expect(knowLine(tile('red', 2, 1), tile('red'))).toBe('In lessons: 2 right, 1 missed.');
    expect(knowLine(undefined, tile('red'))).toBeNull();
  });
});

// David 2026-10-13: "my heat map is not filling in. Despite having 300 games
// analyzed." Batch analysis writes an imported game's slips `counted: false`
// until the game is reviewed; the heat map read only counted rows, so a skill
// failed across his imports stayed GREY. The map reads every game slip.
describe('the heat map reads every game slip, reviewed or not', () => {
  it('uncounted batch rows from imported games turn the tile red', () => {
    const t = heatMap(new Map(), [slip('hung-material', { counted: false }), slip('hung-material', { counted: false })]);
    const hung = t.find((x) => x.tag === 'hung-material');
    expect(hung?.state).toBe('red');
    expect(hung?.openCount).toBe(2);
  });
  it('NEGATIVE CONTROL: a lesson tap, a puzzle miss, a demo game and a spaced-out row do not', () => {
    const t = heatMap(new Map(), [
      slip('hung-material', { source: 'lesson' }),
      slip('hung-material', { source: 'puzzle' }),
      slip('hung-material', { sourceGameId: 'sample-1' }),
      slip('hung-material', { dueAt: Date.now() + 86_400_000 }),
    ]);
    expect(t.find((x) => x.tag === 'hung-material')?.state).toBe('grey');
  });
});
