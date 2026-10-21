import { describe, expect, it } from 'vitest';
import { campaignMap } from './campaignMap';
import type { MissionRecordRow } from '../../missions/registry';

const passes = (id: MissionRecordRow['missionId'], n: number, from = 0): MissionRecordRow[] =>
  Array.from({ length: n }, (_, i) => ({ missionId: id, outcome: 'pass-first-try' as const, at: from + i }));

describe('the Campaign map model', () => {
  it('a fresh record: Level 1 opening and middlegame are next, everything not built is coming, the boss is locked', () => {
    const [ch] = campaignMap([]);
    const l1 = ch.levels[0].slots;
    expect(l1.map((s) => s.status)).toEqual(['active', 'active', 'coming']);
    expect(l1[0].title).toBe('Develop & Castle');
    expect(l1[2].title).toBe('K+Q mate (no stalemate)');
    expect(ch.levels[1].slots.every((s) => s.status === 'coming')).toBe(true);
    expect(ch.boss).toMatchObject({ id: 'grabber', name: 'The Grabber', gate: { kind: 'locked' } });
  });

  it('a learned card shows as learned; two watched misses bring it back', () => {
    const learned = passes('develop-and-castle', 3);
    expect(campaignMap(learned)[0].levels[0].slots[0].status).toBe('graduated');
    const back: MissionRecordRow[] = [...learned, { missionId: 'develop-and-castle', outcome: 'missed', at: 10, watcher: true }, { missionId: 'develop-and-castle', outcome: 'missed', at: 11, watcher: true }];
    expect(campaignMap(back)[0].levels[0].slots[0].status).toBe('reactivated');
  });

  it('the boss stays locked while any mission of the chapter is unbuilt or unlearned', () => {
    const allL1 = [...passes('develop-and-castle', 3), ...passes('free-piece-stay-ahead', 3, 10)];
    expect(campaignMap(allL1)[0].boss.gate.kind).toBe('locked');
  });
});
