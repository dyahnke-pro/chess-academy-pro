// The roads out of a position, and whether a note is standing on one of them.
import { describe, it, expect } from 'vitest';
import { branchesAt, isFork, openingReachesPosition } from './openingBranches';

const sans = (s: string) => s.split(/\s+/).filter(Boolean);

describe('the roads out of a position', () => {
  it('finds the real fork after 1.e4', () => {
    const b = branchesAt(sans('e4'));
    const moves = b.map((x) => x.san);
    for (const reply of ['c5', 'e5', 'e6', 'c6']) expect(moves).toContain(reply);
    // Most-travelled first, so the picker leads with what a student will meet.
    expect(b[0].lines).toBeGreaterThanOrEqual(b[b.length - 1].lines);
  });

  it('names each road by its SHALLOWEST line, which is what a student recognises', () => {
    const sicilian = branchesAt(sans('e4')).find((x) => x.san === 'c5');
    expect(sicilian?.name).toBe('Sicilian Defense');
    // Not "Sicilian Defense: Najdorf Variation, English Attack" — a deeper name
    // would be a road sign for a place further down the road.
    expect(sicilian?.name).not.toContain(':');
  });

  it('a position with one continuation is NOT a fork', () => {
    // Measured: the DB knows exactly one move here, so a picker would be
    // offering a choice that does not exist.
    expect(branchesAt(sans('e4 c5 c3 d5')).length).toBe(1);
    expect(isFork(sans('e4 c5 c3 d5'))).toBe(false);
  });

  it('a real fork is a real fork', () => {
    expect(isFork(sans('e4 c5'))).toBe(true);
    expect(isFork(sans('e4 e5 Nf3 Nc6'))).toBe(true);
  });

  it('says nothing about a position off the map', () => {
    expect(branchesAt(sans('a4 a5 h4 h5 Ra3'))).toEqual([]);
  });

  it('carries a line the coach can actually steer down', () => {
    const b = branchesAt(sans('e4 c5')).find((x) => x.san === 'Nf3');
    expect(b?.deepestPgn.slice(0, 3)).toEqual(['e4', 'c5', 'Nf3']);
    expect(b?.deepestPgn.length).toBeGreaterThan(3);
  });
});

describe('is this note standing on the line it names?', () => {
  it('catches a note filed where its own opening never goes', () => {
    // The Stoltz Attack plays 3...Nf6. A note naming it, filed at 3...d5, is
    // describing a different game — and 683 of 1,356 anchored notes do this.
    expect(openingReachesPosition(
      'Sicilian Defense: Alapin Variation, Stoltz Attack',
      sans('e4 c5 c3 d5'),
    )).toBe(false);
    expect(openingReachesPosition(
      'Sicilian Defense: Smith-Morra Gambit Declined, Alapin Formation',
      sans('e4 c5 c3 d5'),
    )).toBe(false);
  });

  it('accepts a parent name that stops short of the board', () => {
    // "Alapin Variation" is e4 c5 c3 — it ends before d5, but it does not
    // disagree with it. A parent is not a contradiction.
    expect(openingReachesPosition('Sicilian Defense: Alapin Variation', sans('e4 c5 c3 d5'))).toBe(true);
  });

  it('accepts a deeper line that runs past the board', () => {
    expect(openingReachesPosition('Sicilian Defense: Alapin Variation, Stoltz Attack', sans('e4 c5 c3'))).toBe(true);
  });

  it('never rejects an opening the DB has never heard of', () => {
    // Silence from the DB is not evidence against the note.
    expect(openingReachesPosition('Some Farmed Name Not In The DB', sans('e4 c5'))).toBe(true);
  });
});
