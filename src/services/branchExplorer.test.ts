// The story book: walk a road, come back, walk another — and it remembers.
import { describe, it, expect } from 'vitest';
import {
  noteFork, markWalked, unwalked, nextForkToOffer, hasUnexplored, progressAt,
  type ForkLog,
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
