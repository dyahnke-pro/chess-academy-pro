import { describe, expect, it } from 'vitest';
import { setUpFocusGame, TARGET_FIRST_PLY, TARGET_LAST_PLY } from './focusSetup';
import { openSeatTags, PREGAME_LINE } from './focusCard';
import { MOTIF_LEVELS } from '../../data/tacticMotifs';
import type { HoldRecord } from '../../services/holdRate';
import type { MisconceptionTagId } from '../../data/misconceptionTags';

const hold = (rate: number): HoldRecord => ({ posed: 20, held: Math.round(20 * rate), heldWeight: 20 * rate, missed: 20 * (1 - rate), rate });
const exploitAt = (rate: number): Map<MisconceptionTagId, HoldRecord> =>
  new Map(openSeatTags('tactics', 'exploit', new Set(MOTIF_LEVELS)).map((t) => [t, hold(rate)]));

describe('every Learn free-play game is the tactics focus; the record decides how hard', () => {
  it('a fresh record: rung 0, seeded, the Beginner motifs, the one pre-game line', () => {
    const s = setUpFocusGame({ holds: new Map(), games: [], rand: () => 0 });
    expect(s).toMatchObject({ focus: 'tactics', rung: 0, reason: 'seed', window: [], levels: ['beginner'], line: PREGAME_LINE });
    expect(s.seatStates).toEqual({ defend: 'grey', exploit: 'grey' });
  });
  it('a first focus game is seeded from your side\'s hold — short is rung 1, green rung 2 — never the rating', () => {
    expect(setUpFocusGame({ holds: exploitAt(0.8), games: [], rand: () => 0 }).rung).toBe(1);
    expect(setUpFocusGame({ holds: exploitAt(1), games: [], rand: () => 0 }).rung).toBe(2);
    expect(setUpFocusGame({ holds: exploitAt(0.5), games: [], rand: () => 0 }).rung).toBe(0);
  });
  it('once there are focus games, they decide — not the hold', () => {
    const s = setUpFocusGame({ holds: exploitAt(1), games: [{ rung: 0, found: 1, missed: 0, at: 1 }], rand: () => 0 });
    expect(s).toMatchObject({ rung: 0, reason: 'games', window: [{ rung: 0, found: 1, missed: 0, at: 1 }] });
  });
  it('a window that earned the step starts the game a rung up, with an empty window', () => {
    const games = [1, 2, 3].map((at) => ({ rung: 0 as const, found: 1, missed: 0, at }));
    expect(setUpFocusGame({ holds: new Map(), games, rand: () => 0 })).toMatchObject({ rung: 1, window: [] });
  });
  it('the first chance lands at a varied point between move 6 and move 12', () => {
    expect(setUpFocusGame({ holds: new Map(), games: [], rand: () => 0 }).targetPly).toBe(TARGET_FIRST_PLY);
    expect(setUpFocusGame({ holds: new Map(), games: [], rand: () => 0.9999 }).targetPly).toBe(TARGET_LAST_PLY);
    expect(setUpFocusGame({ holds: new Map(), games: [], rand: () => 0.5 }).targetPly).toBe(18);
    expect([TARGET_FIRST_PLY, TARGET_LAST_PLY]).toEqual([11, 24]);
  });
});
