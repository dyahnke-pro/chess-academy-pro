import { describe, it, expect } from 'vitest';
import { heatMap, HOLD_MIN_POSED } from './heatMap';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import type { MisconceptionTagRecord } from '../types';

// Each record sits on its own ply so no two are the same move (a miss is
// counted once per game + ply + skill).
let n = 0;
const fen = (): string => `8/8/8/8/8/8/8/K6k w - - 0 ${++n}`;
const slip = (tag: string, over: Partial<MisconceptionTagRecord> = {}): MisconceptionTagRecord => ({
  id: `s-${n}`, tag, source: 'auto-analysis', createdAt: n, fen: fen(),
  status: 'open', masteryHits: 0, dueAt: 0, sourceGameId: 'g1', ...over,
});
const ev = (tag: string, outcome: 'held' | 'broken', over: Partial<CapabilityEvidenceRecord> = {}): CapabilityEvidenceRecord => ({
  id: `e-${n}`, tag: tag as CapabilityEvidenceRecord['tag'], outcome, fen: fen(), playedSan: 'Kb1',
  posedImportance: 90, recordedAt: n, origin: 'review', prompted: false, sourceGameId: `g${n}`, ...over,
});
const times = <T>(k: number, f: () => T): T[] => Array.from({ length: k }, f);
const tileOf = (tiles: ReturnType<typeof heatMap>, tag: string) => tiles.find((x) => x.tag === tag);

describe('heatMap — the hold rate decides', () => {
  it('a fresh student is ALL grey — never asked is never mastered', () => {
    const tiles = heatMap([], []);
    expect(tiles.length).toBeGreaterThan(20);
    expect(tiles.every((t) => t.state === 'grey' && t.progress === 0)).toBe(true);
    expect(tiles.some((t) => t.tag === 'other')).toBe(false);
  });

  it('fewer than 8 posed is grey however clean, with progress on its way', () => {
    const t = tileOf(heatMap(times(HOLD_MIN_POSED - 1, () => ev('missed-tactic', 'held')), []), 'missed-tactic');
    expect(t?.state).toBe('grey');
    expect(t?.progress).toBeGreaterThan(0);
    expect(t?.progress).toBeLessThan(1);
  });

  it('green ≥ 90%, short 75–89%, red under 75%', () => {
    const mk = (held: number, missed: number) => [...times(missed, () => ev('hung-material', 'broken')), ...times(held, () => ev('hung-material', 'held'))];
    expect(tileOf(heatMap(mk(18, 2), []), 'hung-material')?.state).toBe('green');
    expect(tileOf(heatMap(mk(16, 4), []), 'hung-material')?.state).toBe('short');
    expect(tileOf(heatMap(mk(14, 6), []), 'hung-material')?.state).toBe('red');
  });

  it('a slip is a miss on the record: proven answers do not outvote a pile of open slips', () => {
    const t = tileOf(heatMap(times(4, () => ev('hung-material', 'held')), times(6, () => slip('hung-material'))), 'hung-material');
    expect(t?.hold).toMatchObject({ posed: 10, held: 4, missed: 6 });
    expect(t?.state).toBe('red');
    expect(t?.openCount).toBe(6);
  });

  it('the KNOW reading reads lesson answers only — game slips never reach it', () => {
    const rows = times(8, () => ev('missed-tactic', 'held', { origin: 'lesson' }));
    expect(tileOf(heatMap(rows, times(8, () => slip('missed-tactic')), { reading: 'know' }), 'missed-tactic')?.state).toBe('green');
    expect(tileOf(heatMap(rows, []), 'missed-tactic')?.state).toBe('grey');
  });

  it('a prompted answer is neither held nor missed', () => {
    expect(tileOf(heatMap(times(10, () => ev('missed-tactic', 'held', { prompted: true })), []), 'missed-tactic')?.hold.posed).toBe(0);
  });
});

describe('knowLine — the lesson half of a tile', () => {
  const tile = (state: 'red' | 'green' | 'grey', held = 0, broken = 0) =>
    ({ tag: 'hung-material', label: 'x', state, hold: { posed: 0, held: 0, missed: 0, rate: null }, openCount: 0, openWeight: 0, held, broken, heldStreak: 0, streakGames: 0, progress: 0 }) as const;
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
// until the game is reviewed; the map reads every game slip.
describe('the heat map reads every game slip, reviewed or not', () => {
  it('uncounted batch rows from imported games are misses', () => {
    const hung = tileOf(heatMap([], times(8, () => slip('hung-material', { counted: false }))), 'hung-material');
    expect(hung?.state).toBe('red');
    expect(hung?.openCount).toBe(8);
  });
  it('NEGATIVE CONTROL: a lesson tap, a puzzle miss and a demo game are not game misses', () => {
    const t = heatMap([], [
      ...times(4, () => slip('hung-material', { source: 'lesson' })),
      ...times(4, () => slip('hung-material', { source: 'puzzle' })),
      ...times(4, () => slip('hung-material', { sourceGameId: 'sample-1' })),
    ]);
    expect(tileOf(t, 'hung-material')?.hold.posed).toBe(0);
  });
  it('a spaced-out slip is no longer OPEN, but it is still a miss in the window', () => {
    const t = tileOf(heatMap([], times(8, () => slip('hung-material', { dueAt: Date.now() + 86_400_000 }))), 'hung-material');
    expect(t?.openCount).toBe(0);
    expect(t?.state).toBe('red');
  });
});
