// WO-LOOP-01 — the sentence that closes the loop out loud. Negative-controlled:
// a fresh record, an unmatched fundamental, a prior that is THIS game, and a
// label already spoken all stay silent. Deterministic `now` throughout.
import { describe, it, expect } from 'vitest';
import { recall } from './fundamentalRecurrence';
import type { WeaknessSignal } from './weaknessSignal';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);

function sig(over: Partial<WeaknessSignal> = {}): WeaknessSignal {
  return {
    clusterId: 'fundamental:loose-piece',
    capabilityTag: null, proven: false, bucket: 'tactical',
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

describe('recall — the loop, out loud', () => {
  it('REVIEW: names the count in GAMES and the last PRIOR game, never this one', () => {
    const line = recall({
      matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [sig()], currentGameId: 'game-B', register: 'review', memory: new Set(), now: NOW,
    });
    expect(line).toBe('This one keeps recurring in your games — loose pieces, the second game now — the last one was against Svidler, Peter 2 weeks ago. Worth drilling.');
  });

  it('LIVE: present tense, same facts; Learn passes no game id so every recorded game is prior', () => {
    const line = recall({
      matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [sig()], register: 'live', memory: new Set(), now: NOW,
    });
    expect(line).toBe("You've walked into this before — loose pieces, the third game now — the last one was against Carlsen, M. yesterday.");
  });

  it('negative control: a fresh record says nothing', () => {
    expect(recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [], register: 'review', memory: new Set(), now: NOW })).toBeNull();
  });

  it('negative control: an unmatched fundamental says nothing (no invented row)', () => {
    expect(recall({ matches: [{ fundamental: 'knight-to-the-rim' }], direction: 'failed', signals: [sig()], register: 'review', memory: new Set(), now: NOW })).toBeNull();
  });

  it('negative control: the only recorded game IS this game — two slips in one game are not "recurring in your games"', () => {
    const only = sig({ games: [{ gameId: 'game-B', opponentName: 'Carlsen, M.', playedAt: NOW - DAY }], total: 2 });
    expect(recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [only], currentGameId: 'game-B', register: 'review', memory: new Set(), now: NOW })).toBeNull();
  });

  it('say-once per game: the second matching move stays silent on the label', () => {
    const seen = new Set<string>();
    const first = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [sig()], currentGameId: 'game-B', register: 'review', memory: seen, now: NOW });
    const second = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [sig()], currentGameId: 'game-B', register: 'review', memory: seen, now: NOW });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('takes the FIRST attributed fundamental that recurs, in attribution order', () => {
    const tempo = sig({ clusterId: 'fundamental:tempo-handed', capabilityTag: null, proven: false, label: 'Handing over tempi' });
    const line = recall({
      matches: [{ fundamental: 'same-piece-twice' }, { fundamental: 'tempo-handed' }, { fundamental: 'loose-piece' }], direction: 'failed', signals: [tempo, sig()], currentGameId: 'game-B', register: 'review', memory: new Set(), now: NOW,
    });
    expect(line).toMatch(/handing over tempi/);
  });

  it('no opponent on record → no "against" clause; no date → no recency (empty > invented)', () => {
    const bare = sig({ games: [{ gameId: 'game-B' }, { gameId: 'game-A' }] });
    const line = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [bare], currentGameId: 'game-B', register: 'review', memory: new Set(), now: NOW });
    expect(line).toBe('This one keeps recurring in your games — loose pieces, the second game now. Worth drilling.');
  });

  it('ONE ledger, two directions: the failure and the hold are each said once, independently', () => {
    const memory = new Set<string>();
    const failed = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [sig()], currentGameId: 'game-B', register: 'review', memory, now: NOW });
    const held = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'held', signals: [sig()], currentGameId: 'game-B', register: 'review', memory, now: NOW });
    const heldAgain = recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'held', signals: [sig()], currentGameId: 'game-B', register: 'review', memory, now: NOW });
    expect(failed).toMatch(/keeps recurring/);
    expect(held).toMatch(/^This time you held it — /);
    expect(heldAgain).toBeNull();
  });

  it('minOpen: only a hole the student KEEPS falling in, the most recurring first', () => {
    const tempo = sig({ clusterId: 'fundamental:tempo-handed', label: 'Handing over tempi', openCount: 5 });
    const once = sig({ openCount: 1 });
    expect(recall({ matches: [{ fundamental: 'loose-piece' }], direction: 'failed', signals: [once], currentGameId: 'game-B', register: 'review', memory: new Set(), minOpen: 2, now: NOW })).toBeNull();
    const line = recall({ matches: [{ fundamental: 'loose-piece' }, { fundamental: 'tempo-handed' }], direction: 'failed', signals: [sig(), tempo], currentGameId: 'game-B', register: 'review', memory: new Set(), minOpen: 2, now: NOW });
    expect(line).toMatch(/handing over tempi/);
  });
});
