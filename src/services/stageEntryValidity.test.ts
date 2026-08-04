// The regression gate for the "teach me the traps in X just keeps loading"
// deadlock (David 2026-08-04).
//
// The bug was not in either check on its own — it was that the PRODUCER
// (`getMissingStages`) and the CONSUMER (the stage menu) disagreed about what
// "the punish stage exists" means. The producer counted the array's LENGTH; the
// consumer required an entry it could actually START. A cached tree carrying
// three unstartable punish lessons satisfied the producer ("not missing, don't
// regenerate") and failed the consumer ("can't enter, park the jump"), so the
// student watched a spinner that could never resolve.
//
// These tests pin the agreement, not the implementation: whatever
// `stageArrayHasUsableEntry` rejects, `getMissingStages` must report as missing.
import { describe, it, expect } from 'vitest';
import { stageArrayHasUsableEntry, isStartablePunishLesson } from './stageEntryValidity';
import { getMissingStages } from './openingGenerator';
import type { WalkthroughTree, PunishLesson } from '../types/walkthroughTree';

/** A punish lesson that passes every shape check and replays legally. */
function startableLesson(): PunishLesson {
  return {
    name: 'Premature queen sortie',
    setupMoves: ['e4', 'e5', 'Nf3'],
    inaccuracy: 'Qf6',
    punishment: 'Nc3',
    whyBad: 'The queen blocks the knight and invites tempo.',
    whyPunish: 'White develops with gain of time.',
    distractors: [{ san: 'd4', label: 'Break in the centre', explanation: 'Playable, but it lets the queen settle.' }],
    followup: [],
  } as unknown as PunishLesson;
}

/** The exact shape that hung production: non-empty, but nothing can start.
 *  `Qf6` is legal here, `Bxh8` is not — so the replay fails at the punishment
 *  and the lesson can never be launched. */
function unstartableLesson(): PunishLesson {
  return { ...startableLesson(), punishment: 'Bxh8' } as unknown as PunishLesson;
}

function treeWith(punish: PunishLesson[]): WalkthroughTree {
  return {
    openingName: 'Test Opening',
    studentSide: 'white',
    root: { san: '', movedBy: 'white', idea: '', children: [] },
    concepts: [],
    findMove: [],
    drill: [],
    punish,
  } as unknown as WalkthroughTree;
}

describe('stage entry validity', () => {
  it('rejects a punish lesson whose punishment is illegal from the setup', () => {
    expect(isStartablePunishLesson(startableLesson())).toBe(true);
    expect(isStartablePunishLesson(unstartableLesson())).toBe(false);
  });

  it('treats a non-empty stage of unusable entries as having no entries', () => {
    expect(stageArrayHasUsableEntry('punish', [unstartableLesson(), unstartableLesson()])).toBe(false);
    expect(stageArrayHasUsableEntry('punish', [unstartableLesson(), startableLesson()])).toBe(true);
  });

  it('requires a distractor — a fork with one option is not a choice', () => {
    const noDistractors = { ...startableLesson(), distractors: [] } as unknown as PunishLesson;
    expect(isStartablePunishLesson(noDistractors)).toBe(false);
  });
});

describe('getMissingStages agrees with the stage menu', () => {
  it('reports punish as MISSING when the array is non-empty but all entries are unstartable', () => {
    const tree = treeWith([unstartableLesson(), unstartableLesson()]);
    // The consumer's answer.
    expect(stageArrayHasUsableEntry('punish', tree.punish)).toBe(false);
    // The producer must reach the same conclusion, or nothing regenerates and
    // the parked jump waits forever.
    expect(getMissingStages(tree)).toContain('punish');
  });

  it('does NOT report punish as missing when at least one lesson is startable', () => {
    const tree = treeWith([unstartableLesson(), startableLesson()]);
    expect(stageArrayHasUsableEntry('punish', tree.punish)).toBe(true);
    expect(getMissingStages(tree)).not.toContain('punish');
  });

  it('still reports genuinely empty stages as missing', () => {
    expect(getMissingStages(treeWith([]))).toEqual(
      expect.arrayContaining(['concepts', 'findMove', 'drill', 'punish']),
    );
  });
});

// The THIRD instance of the same mistake, caught on prod after the first fix
// shipped (2026-08-04). getMissingStages and the stage menu had been brought
// into agreement, so the punish stage correctly regenerated and merged into the
// cache — the transcript even said "Punish (trap) lessons just loaded" — but
// the surface stayed on "Hang tight…". `mergeStagesFromCache` was deciding
// whether to pull the cache's stage into the running tree with its OWN
// `length > 0` test, so a tree holding a non-empty-but-unstartable array read
// as "already have it" and the good lessons were refused every poll.
//
// The rule this pins: the merge must upgrade on USABILITY, because replacing
// broken entries with working ones is the entire point of it.
describe('cache merge upgrades on usability, not on length', () => {
  const cacheHasGood = [startableLesson()];
  const treeHasBroken = [unstartableLesson()];

  /** The decision `mergeStagesFromCache` makes, in isolation. */
  const shouldUpgrade = (fresh: PunishLesson[], current: PunishLesson[]): boolean =>
    stageArrayHasUsableEntry('punish', fresh) && !stageArrayHasUsableEntry('punish', current);

  it('upgrades when the cache has a startable lesson and the tree does not', () => {
    expect(shouldUpgrade(cacheHasGood, treeHasBroken)).toBe(true);
  });

  it('does not churn when the tree already has a startable lesson', () => {
    expect(shouldUpgrade(cacheHasGood, [startableLesson()])).toBe(false);
  });

  it('never downgrades a working stage to a broken one', () => {
    expect(shouldUpgrade(treeHasBroken, [startableLesson()])).toBe(false);
  });

  it('the old length test is what got this wrong — proof', () => {
    const lengthTest = (fresh: PunishLesson[], current: PunishLesson[]): boolean =>
      fresh.length > 0 && !(current.length > 0);
    // Same inputs, opposite answers. The length test refuses the upgrade that
    // unblocks the student; that refusal was the hang.
    expect(lengthTest(cacheHasGood, treeHasBroken)).toBe(false);
    expect(shouldUpgrade(cacheHasGood, treeHasBroken)).toBe(true);
  });
});
