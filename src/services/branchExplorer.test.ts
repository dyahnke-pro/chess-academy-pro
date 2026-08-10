// The story book: walk a road, come back, walk another — and it remembers.
import { describe, it, expect } from 'vitest';
import {
  hasUnexplored, markWalked, nextForkToOffer, noteFamilyFork, noteFork, progressAt, type ForkLog, unwalked,
} from './branchExplorer';

const sans = (s: string) => s.split(/\s+/).filter(Boolean);

describe('meeting a fork', () => {
  it('records the roads out of a real fork', () => {
    const log = noteFork([], sans('e4'));
    expect(log).toHaveLength(1);
    expect(log[0].branches.length).toBeGreaterThan(2);
    expect(log[0].branches.every((b) => !b.walked)).toBe(true);
  });

  it('does not record a position with only one continuation', () => {
    // Offering one road is offering a choice that does not exist.
    expect(noteFork([], sans('e4 c5 c3 d5'))).toHaveLength(0);
  });

  it('does not record a position off the map', () => {
    expect(noteFork([], sans('a4 a5 h4 h5 Ra3'))).toHaveLength(0);
  });
});

describe('the selection persists — the whole point', () => {
  it('meeting a known fork again does not wipe what was walked', () => {
    // The student explores the Sicilian twelve moves deep and comes back. The
    // picker must still know they walked it.
    let log: ForkLog = noteFork([], sans('e4'));
    log = markWalked(log, 'e4', 'c5', 12);
    log = noteFork(log, sans('e4')); // returned to the fork
    expect(log).toHaveLength(1);
    const sicilian = log[0].branches.find((b) => b.san === 'c5');
    expect(sicilian?.walked).toBe(true);
    expect(sicilian?.depth).toBe(12);
  });

  it('depth only ever grows', () => {
    // Coming back to a road you took nine moves deep and stepping two in must
    // not report it as shallower than it was.
    let log: ForkLog = noteFork([], sans('e4'));
    log = markWalked(log, 'e4', 'e5', 9);
    log = markWalked(log, 'e4', 'e5', 2);
    expect(log[0].branches.find((b) => b.san === 'e5')?.depth).toBe(9);
  });

  it('tracks what is left and reports progress honestly', () => {
    let log: ForkLog = noteFork([], sans('e4'));
    const total = log[0].branches.length;
    log = markWalked(log, 'e4', 'c5', 4);
    log = markWalked(log, 'e4', 'e5', 4);
    expect(unwalked(log[0])).toHaveLength(total - 2);
    expect(progressAt(log[0])).toEqual({ walked: 2, total });
  });
});

describe('where to go back to', () => {
  it('offers the MOST RECENT fork with a road untaken', () => {
    // Finish this chapter's alternatives before rewinding to an earlier one.
    let log: ForkLog = noteFork([], sans('e4'));
    log = noteFork(log, sans('e4 c5'));
    expect(nextForkToOffer(log)?.id).toBe('e4 c5');
  });

  it('rewinds to an earlier fork once the recent one is exhausted', () => {
    let log: ForkLog = noteFork([], sans('e4'));
    log = noteFork(log, sans('e4 c5'));
    for (const b of log[1].branches) log = markWalked(log, 'e4 c5', b.san, 1);
    expect(nextForkToOffer(log)?.id).toBe('e4');
  });

  it('knows when the whole tree has been walked', () => {
    let log: ForkLog = noteFork([], sans('e4'));
    expect(hasUnexplored(log)).toBe(true);
    for (const b of log[0].branches) log = markWalked(log, 'e4', b.san, 1);
    expect(hasUnexplored(log)).toBe(false);
    expect(nextForkToOffer(log)).toBeNull();
  });

  it('carries the moves needed to get back there', () => {
    // Returning is REPLAYING a recorded list, never reconstructing from memory.
    const log = noteFork(noteFork([], sans('e4')), sans('e4 c5'));
    expect(log[1].historySans).toEqual(['e4', 'c5']);
  });
});

describe('the family fork — the roads the student was actually SHOWN', () => {
  // `noteFork` reads roads out of the opening DB for a position. The line
  // PICKER has already chosen its own set — the named variations of a family —
  // and those are the roads the student saw. A fork the DB knows about and a
  // fork the student was offered are not the same thing, and the one worth
  // remembering is the one on their screen.
  const ROADS = [
    { id: 'Sicilian Defense: Dragon Variation', label: 'Dragon Variation' },
    { id: 'Sicilian Defense: Najdorf Variation', label: 'Najdorf Variation' },
    { id: 'Sicilian Defense: Richter-Rauzer', label: 'Richter-Rauzer' },
  ];

  it('records what was offered, and remembers it after one is taken', () => {
    let log = noteFamilyFork([], 'Sicilian Defense', ROADS);
    expect(log[0].branches).toHaveLength(3);
    log = markWalked(log, 'Sicilian Defense', ROADS[0].id, 1);
    expect(unwalked(log[0]).map((b) => b.name)).toEqual(['Najdorf Variation', 'Richter-Rauzer']);
    expect(progressAt(log[0])).toEqual({ walked: 1, total: 3 });
  });

  it('SURVIVES meeting the same family again — the persistence David asked for', () => {
    // "as long as the selection persists". Walking the Dragon, coming back to
    // the Sicilian, and being offered the Dragon again as though it were new is
    // exactly the picker-that-forgets this replaces.
    let log = noteFamilyFork([], 'Sicilian Defense', ROADS);
    log = markWalked(log, 'Sicilian Defense', ROADS[0].id, 1);
    log = noteFamilyFork(log, 'Sicilian Defense', ROADS);
    expect(log).toHaveLength(1);
    expect(progressAt(log[0]).walked, 'the walk was forgotten on the return trip').toBe(1);
    expect(unwalked(log[0]).some((b) => b.name === 'Dragon Variation')).toBe(false);
  });

  it('picks up a road that only appears on the second visit', () => {
    let log = noteFamilyFork([], 'Sicilian Defense', ROADS.slice(0, 2));
    log = markWalked(log, 'Sicilian Defense', ROADS[0].id, 1);
    log = noteFamilyFork(log, 'Sicilian Defense', ROADS);
    expect(log[0].branches).toHaveLength(3);
    expect(progressAt(log[0]).walked).toBe(1);
  });

  it('keeps two families apart', () => {
    let log = noteFamilyFork([], 'Sicilian Defense', ROADS);
    log = noteFamilyFork(log, 'French Defense', [
      { id: 'French Defense: Winawer', label: 'Winawer' },
      { id: 'French Defense: Tarrasch', label: 'Tarrasch' },
    ]);
    log = markWalked(log, 'Sicilian Defense', ROADS[0].id, 1);
    expect(progressAt(log[0]).walked).toBe(1);
    expect(progressAt(log[1]).walked, 'a walk leaked across families').toBe(0);
  });

  it('offers nothing when there was never a real choice', () => {
    expect(noteFamilyFork([], 'Some Line', [{ id: 'a', label: 'A' }])).toHaveLength(0);
  });

  it('stops offering once every road has been walked', () => {
    let log = noteFamilyFork([], 'Sicilian Defense', ROADS);
    for (const r of ROADS) log = markWalked(log, 'Sicilian Defense', r.id, 1);
    expect(nextForkToOffer(log)).toBeNull();
    expect(hasUnexplored(log)).toBe(false);
  });
});
