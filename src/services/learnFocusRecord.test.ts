import { describe, expect, it } from 'vitest';
import { rungGamesFrom, type LearnFocusResultRecord } from './learnFocusRecord';

const tally = { defend: { posed: 0, found: 0, missed: 0, steered: 0 }, exploit: { posed: 0, found: 0, missed: 0, steered: 0 } };

describe('the rung rows (WO-FOCUS-TACTICS-01)', () => {
  it('reads every game played at a rung, and BRIDGES the rows an older build wrote (no rung) by leaving them out', () => {
    const rows: LearnFocusResultRecord[] = [
      // A row from the three-lesson build: focus 'loose-pieces', no rung.
      { id: 'focus-a', gameId: 'a', focus: 'loose-pieces', mode: 'teach', state: 'red', announced: true, revealed: false, tally, at: 1 },
      { id: 'focus-b', gameId: 'b', focus: 'tactics', rung: 0, atRung: { found: 2, missed: 1 }, tally, presented: null, at: 2 },
      { id: 'focus-c', gameId: 'c', focus: 'tactics', rung: 1, atRung: { found: 0, missed: 0 }, tally, presented: null, at: 3 },
    ];
    expect(rungGamesFrom(rows)).toEqual([
      { rung: 0, found: 2, missed: 1, at: 2 },
      { rung: 1, found: 0, missed: 0, at: 3 },
    ]);
  });
});
