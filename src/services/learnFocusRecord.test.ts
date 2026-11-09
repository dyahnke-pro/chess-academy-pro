import { beforeEach, describe, expect, it } from 'vitest';
import { loadFocusSetupInput, rungGamesFrom, writeLearnFocusResult, type LearnFocusResultRecord } from './learnFocusRecord';
import { db } from '../db/schema';

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

describe('the misses that carry to the next game (#158)', () => {
  beforeEach(async () => { await db.learnFocusResults.clear(); });
  const row = (gameId: string, at: number, carry?: LearnFocusResultRecord['carry']): Omit<LearnFocusResultRecord, 'id'> =>
    ({ gameId, focus: 'tactics', rung: 0, atRung: { found: 0, missed: 0 }, tally, presented: null, at, ...(carry !== undefined ? { carry } : {}) });

  it('the newest game decides: what it left owed, in its order, is the next game\'s carry', async () => {
    await writeLearnFocusResult(row('g1', 1, [{ seat: 'exploit', tag: 'missed-your-free-piece' }]));
    await writeLearnFocusResult(row('g2', 2, [{ seat: 'defend', tag: 'missed-your-fork' }, { seat: 'exploit', tag: 'missed-your-free-piece' }]));
    expect((await loadFocusSetupInput()).carry).toEqual([{ seat: 'defend', tag: 'missed-your-fork' }, { seat: 'exploit', tag: 'missed-your-free-piece' }]);
  });
  it('a game that answered everything carries nothing — nor does a row older than the carry', async () => {
    await writeLearnFocusResult(row('g1', 1, [{ seat: 'exploit', tag: 'missed-your-fork' }]));
    await writeLearnFocusResult(row('g2', 2, []));
    expect((await loadFocusSetupInput()).carry).toEqual([]);
    await writeLearnFocusResult(row('g3', 3));
    expect((await loadFocusSetupInput()).carry).toEqual([]);
  });
  it('a pattern a later build retired carries nothing; the rest still do', async () => {
    await writeLearnFocusResult(row('g1', 1, [{ seat: 'exploit', tag: 'a-retired-tag' as never }, { seat: 'defend', tag: 'missed-your-fork' }]));
    expect((await loadFocusSetupInput()).carry).toEqual([{ seat: 'defend', tag: 'missed-your-fork' }]);
  });
  it('BRIDGE: a piece left loose, owed for an hour before it was found the coach cannot set one up, carries no more', async () => {
    await writeLearnFocusResult(row('g1', 1, [{ seat: 'defend', tag: 'hung-material' }, { seat: 'defend', tag: 'missed-opponents-threat' }]));
    expect((await loadFocusSetupInput()).carry).toEqual([{ seat: 'defend', tag: 'missed-opponents-threat' }]);
  });
  it('BRIDGE: a row from before their side carried holds bare tags — each is yours', async () => {
    await writeLearnFocusResult(row('g1', 1, ['missed-your-fork', 'missed-your-free-piece']));
    expect((await loadFocusSetupInput()).carry).toEqual([{ seat: 'exploit', tag: 'missed-your-fork' }, { seat: 'exploit', tag: 'missed-your-free-piece' }]);
  });
});
