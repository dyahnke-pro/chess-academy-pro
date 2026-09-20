import { describe, it, expect } from 'vitest';
import { recurrenceFor, recurrenceLine, composeCallbackLine } from './misconceptionCallbacks';
import { listMisconceptionTags } from '../services/misconceptionService';

// "We've talked about this" (David 2026-07-11). Count + recency are computed
// from the records; the line is null on a first occurrence — a coach doesn't
// call back to something that never happened.

const TAG = listMisconceptionTags().find((t) => t.id !== 'other')!.id;
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

describe('composeCallbackLine', () => {
  it('is silent on the first occurrence', () => {
    expect(composeCallbackLine(TAG, [{ createdAt: NOW, counted: true }], NOW)).toBeNull();
    expect(composeCallbackLine(TAG, [], NOW)).toBeNull();
  });

  it('calls back on a repeat with the computed count + recency', () => {
    const line = composeCallbackLine(
      TAG,
      [{ createdAt: NOW - 2 * DAY, counted: true }, { createdAt: NOW, counted: true }],
      NOW,
    );
    expect(line).toContain("We've seen this before");
    expect(line).toContain('the second time');
    expect(line).toContain('2 days ago');
  });

  it('counts a third occurrence and phrases same-day recency', () => {
    const line = composeCallbackLine(
      TAG,
      [
        { createdAt: NOW - 30 * DAY, counted: true },
        { createdAt: NOW - DAY / 2, counted: true },
        { createdAt: NOW, counted: true },
      ],
      NOW,
    );
    expect(line).toContain('the third time');
    expect(line).toContain('earlier today');
  });

  it('ignores non-counted (display-only) records', () => {
    const line = composeCallbackLine(
      TAG,
      [{ createdAt: NOW - DAY, counted: false }, { createdAt: NOW, counted: true }],
      NOW,
    );
    expect(line).toBeNull();
  });

  it('returns null for an unknown tag (never invents a label)', () => {
    expect(
      composeCallbackLine('not-a-real-tag', [{ createdAt: NOW - DAY, counted: true }, { createdAt: NOW, counted: true }], NOW),
    ).toBeNull();
  });

  it('never calls back on the "other"/uncategorized holding pen (David 2026-07-19)', () => {
    // Two distinct opening slips both land in `other`; counting them as one
    // recurring "pattern" and voicing the internal label "uncategorized" is a
    // bug. The catch-all is a review queue, not a real misconception.
    expect(
      composeCallbackLine('other', [{ createdAt: NOW - DAY, counted: true }, { createdAt: NOW, counted: true }], NOW),
    ).toBeNull();
  });
});

// WO-LOOP-01 — counted in GAMES, honest about THIS game.
describe('recurrenceFor — games, not rows', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = Date.UTC(2026, 8, 20);
  const games = [
    { gameId: 'B', opponentName: 'Carlsen, M.', playedAt: NOW - DAY },
    { gameId: 'A', opponentName: 'Svidler, Peter', playedAt: NOW - 17 * DAY },
  ];
  it('this game already swept: prior = the OTHER game, occurrences = games', () => {
    expect(recurrenceFor({ total: 5, games }, 'B')).toEqual({ occurrences: 2, prior: { opponentName: 'Svidler, Peter', playedAt: NOW - 17 * DAY } });
  });
  it('this game not yet swept (or live): every recorded game is prior, this is one more', () => {
    expect(recurrenceFor({ total: 5, games }, 'live-game')).toEqual({ occurrences: 3, prior: { opponentName: 'Carlsen, M.', playedAt: NOW - DAY } });
    expect(recurrenceFor({ total: 5, games }, undefined)?.occurrences).toBe(3);
  });
  it('two rows in ONE game are not a recurrence across games', () => {
    expect(recurrenceFor({ total: 2, games: [games[0]] }, 'B')).toBeNull();
  });
  it('provenance known but empty → null; no provenance at all → the count-based read (coach-only shapes)', () => {
    expect(recurrenceFor({ total: 3, games: [] }, 'B')).toBeNull();
    expect(recurrenceFor({ openCount: 4 })).toEqual({ occurrences: undefined });
    expect(recurrenceFor({ openCount: 1, total: 1 })).toBeNull();
    expect(recurrenceFor({ total: 3 })).toEqual({ occurrences: 3 });
  });
  it('recurrenceLine — two registers, one set of facts; clauses only when known', () => {
    const read = recurrenceFor({ total: 5, games }, 'B')!;
    expect(recurrenceLine('Loose pieces', read, 'review', NOW)).toBe('This one keeps recurring in your games — loose pieces, the second game now — the last one was against Svidler, Peter 2 weeks ago. Worth drilling.');
    expect(recurrenceLine('Loose pieces', read, 'live', NOW)).toBe("You've walked into this before — loose pieces, the second game now — the last one was against Svidler, Peter 2 weeks ago.");
    expect(recurrenceLine('Hanging pieces', { occurrences: undefined }, 'review', NOW)).toBe('This one keeps recurring in your games — hanging pieces. Worth drilling.');
  });
});
