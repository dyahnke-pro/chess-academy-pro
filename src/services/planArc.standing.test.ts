import { describe, it, expect } from 'vitest';
import { standingPlans, stepArc, EMPTY_ARC, type Aim } from './planArc';
import { createStoryStore, planArcAt } from './gameStory';

// "WHAT'S THE PLAN?" READS THE GAME'S OWN STORY (WO-STORY-MATRIX-01 P1-8e-b):
// each side's plan as the arc announced it, never a second read with hindsight.
const EMPTY_BOARD = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
const outpost: Aim = { id: 'outpost:d5', kind: 'outpost', squares: ['d5'], goal: 'd5', phrase: 'the outpost on d5' };

describe('standingPlans', () => {
  it('nothing announced, nothing said', () => {
    expect(standingPlans({ student: EMPTY_ARC, opponent: EMPTY_ARC })).toEqual([]);
  });
  it('an announced aim is said in the arc\'s own words, from its seat', () => {
    let st = EMPTY_ARC;
    for (let k = 0; k < 3; k += 1) st = stepArc(st, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    expect(Object.values(st.entries).some((e) => e.announced)).toBe(true);
    expect(standingPlans({ student: EMPTY_ARC, opponent: st })).toEqual(['Their plan is taking shape: the outpost on d5.']);
  });
  it('the story answers at the ply asked: the plans as the walk had told them there', () => {
    let st = EMPTY_ARC;
    for (let k = 0; k < 3; k += 1) st = stepArc(st, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    const story = createStoryStore('g');
    story.setPlans(10, { ...story.plans(), arc: { student: EMPTY_ARC, opponent: st } });
    const cp = story.serialize();
    expect(standingPlans(planArcAt(cp, 12))).toEqual(['Their plan is taking shape: the outpost on d5.']);
    // Before the walk told it, there was no plan to answer with.
    expect(standingPlans(planArcAt(cp, 5))).toEqual([]);
  });
});
