import { describe, expect, it } from 'vitest';
import { campaignMap } from './campaignMap';
import type { MissionRecordRow } from '../../missions/registry';

/** First-try passes played at the card's graduation level (one step above its
 *  own dials) — the passes that graduate a card. */
const passes = (id: MissionRecordRow['missionId'], n: number, from = 0): MissionRecordRow[] =>
  Array.from({ length: n }, (_, i) => ({ missionId: id, outcome: 'pass-first-try' as const, at: from + i, harder: 1 }));

describe('the Campaign map model', () => {
  it('a fresh record: all three Level 1 missions are next, everything not built is coming, the boss is locked', () => {
    const [ch] = campaignMap([]);
    const l1 = ch.levels[0].slots;
    expect(l1.map((s) => s.status)).toEqual(['active', 'active', 'active']);
    expect(l1[0].title).toBe('Develop & Castle');
    expect(l1[2].title).toBe('King and queen mate');
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

describe('the map by track (David 2026-10-21: intermediates skip the easy levels)', () => {
  it('Beginner is the default and keeps its chapters 1–5', () => {
    expect(campaignMap([]).map((c) => c.chapter.tier)).toEqual([1, 2, 3, 4, 5]);
  });

  it('Intermediate shows chapters 6–10, Levels 19–36, and no Level 1 card is its mission', () => {
    const chapters = campaignMap([], [], undefined, 'intermediate');
    expect(chapters.map((c) => c.chapter.tier)).toEqual([6, 7, 8, 9, 10]);
    const levels = chapters.flatMap((c) => c.levels.map((l) => l.level));
    expect(levels[0]).toBe(19);
    expect(levels[levels.length - 1]).toBe(36);
    expect(chapters.flatMap((c) => c.levels.flatMap((l) => l.slots)).some((s) => s.cardId === 'develop-and-castle')).toBe(false);
    // An unbuilt slot shows the mission list's name as coming.
    expect(chapters[0].levels[0].slots[2].title).toBe('Outflanking');
  });

  it('Advanced is silent games by theme: no mission slots, each chapter names its boss', () => {
    const chapters = campaignMap([], [], undefined, 'advanced');
    expect(chapters.map((c) => c.chapter.tier)).toEqual([11, 12, 13, 14]);
    expect(chapters.every((c) => c.levels.length === 0 && !!c.chapter.theme)).toBe(true);
    expect(chapters[3].chapter.bossName).toBe('The Mirror');
  });

  it('a boss not built yet is null, never a broken node', () => {
    const tier2 = campaignMap([])[1];
    expect(tier2.boss).toBeNull();
    expect(tier2.chapter.bossName).toBe('The Trapper');
  });
});
