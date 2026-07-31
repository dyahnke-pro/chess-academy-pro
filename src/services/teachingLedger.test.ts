import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  recordTeachingVisit,
  getTeachingVisits,
  planTeachingVisit,
  takeawayForTree,
} from './teachingLedger';
import type { WalkthroughTree } from '../types/walkthroughTree';

const TREE: WalkthroughTree = {
  openingName: 'Grand Prix Attack',
  eco: 'B23',
  intro: 'The whole story aims at one square: f7.',
  shortIntro: 'The Grand Prix: a kingside storm aimed at f7.',
  outro: 'That is the story.',
  root: {
    san: null, movedBy: null, idea: '', children: [
      {
        node: {
          san: 'e4', movedBy: 'white', idea: 'open', children: [
            { label: 'Main line — c5', forkSubtitle: 'main', node: { san: 'c5', movedBy: 'black', idea: 'sicilian', children: [] } },
            { label: 'Schofman Variation', forkSubtitle: 'g6 setup', node: { san: 'g6', movedBy: 'black', idea: 'fianchetto', children: [] } },
          ],
        },
      },
    ],
  },
};

beforeEach(async () => {
  await db.meta.delete('teachingLedger');
});

describe('teachingLedger', () => {
  it('first visit: no recap, plans the main line', async () => {
    const plan = await planTeachingVisit('Grand Prix Attack', TREE);
    expect(plan.recap).toBeNull();
    expect(plan.layer).toBe('main');
  });

  it('second visit: recaps the main line, adds the first unheard branch', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', takeawayForTree(TREE));
    const plan = await planTeachingVisit('Grand Prix Attack', TREE);
    expect(plan.recap).toContain('Last time we covered');
    expect(plan.recap).toContain('Today we add');
    expect(plan.layer).toBe('branch:Schofman Variation');
  });

  it('after all branches: offers the continuation, then the weave', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', 'the f7 story');
    await recordTeachingVisit('Grand Prix Attack', 'branch:Schofman Variation', 'g6 setup');
    let plan = await planTeachingVisit('Grand Prix Attack', TREE);
    expect(plan.layer).toBe('continuation');
    await recordTeachingVisit('Grand Prix Attack', 'continuation', 'the play-out');
    plan = await planTeachingVisit('Grand Prix Attack', TREE);
    expect(plan.layer).toBe('weave');
  });

  it('re-recording a layer refreshes, never duplicates', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', 'v1');
    await recordTeachingVisit('Grand Prix Attack', 'main', 'v2');
    const visits = await getTeachingVisits('Grand Prix Attack');
    expect(visits).toHaveLength(1);
    expect(visits[0].takeaway).toBe('v2');
  });

  it('ledger is per opening', async () => {
    await recordTeachingVisit('Grand Prix Attack', 'main', 'x');
    expect(await getTeachingVisits('Caro-Kann Defense')).toHaveLength(0);
  });
});
