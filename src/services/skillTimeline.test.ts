import { describe, it, expect } from 'vitest';
import { buildSkillTimelines, currentStrength, parseGameDate, relativeDay } from './skillTimeline';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 3);

describe('skillTimeline', () => {
  it('dates a slip by its game, not by when it was recorded', () => {
    const played = NOW - 70 * DAY;
    const [line] = buildSkillTimelines(
      ['hung-material'],
      [{ tag: 'hung-material', createdAt: NOW, sourceGameId: 'g1' }],
      [],
      new Map([['g1', played]]),
      NOW,
    );
    expect(line.weeks[25].missed).toBe(0);
    expect(line.weeks[15].missed).toBe(1);
    expect(line.lastMistakeAt).toBe(played);
  });

  it('scores held / (held + missed); never-asked weeks stay null', () => {
    const [line] = buildSkillTimelines(
      ['hung-material'],
      [{ tag: 'hung-material', createdAt: NOW }],
      [
        { tag: 'hung-material', outcome: 'held', recordedAt: NOW, prompted: false },
        { tag: 'hung-material', outcome: 'held', recordedAt: NOW, prompted: false },
        { tag: 'hung-material', outcome: 'held', recordedAt: NOW, prompted: true },
      ],
      new Map(),
      NOW,
    );
    expect(line.weeks[25].score).toBeCloseTo(2 / 3);
    expect(line.weeks[0].score).toBeNull();
  });

  it('skips uncounted slips and counts a broken answer as a mistake', () => {
    const [line] = buildSkillTimelines(
      ['missed-tactic'],
      [{ tag: 'missed-tactic', createdAt: NOW, counted: false }],
      [{ tag: 'missed-tactic', outcome: 'broken', recordedAt: NOW - DAY, prompted: false }],
      new Map(),
      NOW,
    );
    expect(line.weeks[25].missed).toBe(1);
    expect(line.lastMistakeAt).toBe(NOW - DAY);
  });

  it('currentStrength ranks recent improvement above old success, null when never asked', () => {
    const tags = ['hung-material', 'missed-tactic', 'tempo-handed'] as const;
    const lines = buildSkillTimelines(
      [...tags],
      [
        { tag: 'hung-material', createdAt: NOW - 150 * DAY },
        { tag: 'missed-tactic', createdAt: NOW },
      ],
      [
        { tag: 'hung-material', outcome: 'held', recordedAt: NOW, prompted: false },
        { tag: 'missed-tactic', outcome: 'held', recordedAt: NOW - 150 * DAY, prompted: false },
      ],
      new Map(),
      NOW,
    );
    const [improving, slipping, untested] = lines.map(currentStrength);
    expect(improving).not.toBeNull();
    expect(slipping).not.toBeNull();
    expect(improving as number).toBeGreaterThan(slipping as number);
    expect(untested).toBeNull();
  });

  it('parses ISO and PGN dates, rejects unknowns', () => {
    expect(parseGameDate('2026-03-04')).toBe(Date.UTC(2026, 2, 4));
    expect(parseGameDate('2026.03.04')).toBe(Date.UTC(2026, 2, 4));
    expect(parseGameDate('????.??.??')).toBeNull();
    expect(parseGameDate(undefined)).toBeNull();
  });

  it('relativeDay reads naturally', () => {
    expect(relativeDay(NOW, NOW)).toBe('today');
    expect(relativeDay(NOW - DAY, NOW)).toBe('yesterday');
    expect(relativeDay(NOW - 5 * DAY, NOW)).toBe('5 days ago');
    expect(relativeDay(NOW - 21 * DAY, NOW)).toBe('3 weeks ago');
  });
});
