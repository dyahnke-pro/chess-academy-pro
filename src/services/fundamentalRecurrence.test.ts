// WO-LOOP-01 — the sentence that closes the loop out loud. Negative-controlled:
// a fresh record, an unmatched fundamental, a prior that is THIS game, and a
// label already spoken all stay silent. Deterministic `now` throughout.
import { describe, it, expect } from 'vitest';
import { fundamentalRecurrenceLine } from './fundamentalRecurrence';
import type { WeaknessSignal } from './weaknessSignal';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

function sig(over: Partial<WeaknessSignal> = {}): WeaknessSignal {
  return {
    clusterId: 'fundamental:loose-piece',
    bucket: 'tactical',
    label: 'Loose pieces',
    openCount: 2,
    severity: 40,
    puzzleThemes: [],
    total: 2,
    games: [
      { gameId: 'game-B', opponentName: 'Carlsen, M.', playedAt: NOW - 1 * DAY },
      { gameId: 'game-A', opponentName: 'Svidler, Peter', playedAt: NOW - 17 * DAY },
    ],
    ...over,
  };
}

describe('fundamentalRecurrenceLine — the loop, out loud', () => {
  it('REVIEW: names the count in GAMES and the last PRIOR game, never this one', () => {
    const line = fundamentalRecurrenceLine({
      ids: ['loose-piece'], signals: [sig()], currentGameId: 'game-B', register: 'review', seenLabels: new Set(), now: NOW,
    });
    expect(line).toBe('This one keeps recurring in your games — loose pieces, the second game now — the last one was against Svidler, Peter 2 weeks ago. Worth drilling.');
  });

  it('LIVE: present tense, same facts; Learn passes no game id so every recorded game is prior', () => {
    const line = fundamentalRecurrenceLine({
      ids: ['loose-piece'], signals: [sig()], register: 'live', seenLabels: new Set(), now: NOW,
    });
    expect(line).toBe("You've walked into this before — loose pieces, the third game now — the last one was against Carlsen, M. yesterday.");
  });

  it('negative control: a fresh record says nothing', () => {
    expect(fundamentalRecurrenceLine({ ids: ['loose-piece'], signals: [], register: 'review', seenLabels: new Set(), now: NOW })).toBeNull();
  });

  it('negative control: an unmatched fundamental says nothing (no invented row)', () => {
    expect(fundamentalRecurrenceLine({ ids: ['knight-to-the-rim'], signals: [sig()], register: 'review', seenLabels: new Set(), now: NOW })).toBeNull();
  });

  it('negative control: the only recorded game IS this game — two slips in one game are not "recurring in your games"', () => {
    const only = sig({ games: [{ gameId: 'game-B', opponentName: 'Carlsen, M.', playedAt: NOW - DAY }], total: 2 });
    expect(fundamentalRecurrenceLine({ ids: ['loose-piece'], signals: [only], currentGameId: 'game-B', register: 'review', seenLabels: new Set(), now: NOW })).toBeNull();
  });

  it('say-once per game: the second matching move stays silent on the label', () => {
    const seen = new Set<string>();
    const first = fundamentalRecurrenceLine({ ids: ['loose-piece'], signals: [sig()], currentGameId: 'game-B', register: 'review', seenLabels: seen, now: NOW });
    const second = fundamentalRecurrenceLine({ ids: ['loose-piece'], signals: [sig()], currentGameId: 'game-B', register: 'review', seenLabels: seen, now: NOW });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('takes the FIRST attributed fundamental that recurs, in attribution order', () => {
    const tempo = sig({ clusterId: 'fundamental:tempo-handed', label: 'Handing over tempi' });
    const line = fundamentalRecurrenceLine({
      ids: ['same-piece-twice', 'tempo-handed', 'loose-piece'], signals: [tempo, sig()], currentGameId: 'game-B', register: 'review', seenLabels: new Set(), now: NOW,
    });
    expect(line).toMatch(/handing over tempi/);
  });

  it('no opponent on record → no "against" clause; no date → no recency (empty > invented)', () => {
    const bare = sig({ games: [{ gameId: 'game-B' }, { gameId: 'game-A' }] });
    const line = fundamentalRecurrenceLine({ ids: ['loose-piece'], signals: [bare], currentGameId: 'game-B', register: 'review', seenLabels: new Set(), now: NOW });
    expect(line).toBe('This one keeps recurring in your games — loose pieces, the second game now. Worth drilling.');
  });
});
