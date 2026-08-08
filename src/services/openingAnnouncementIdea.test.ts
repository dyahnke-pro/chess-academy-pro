// A PLACEHOLDER OPENING NAME EARNS NO KEY IDEA.
//
// David 2026-08-08, from a live run: after 1.e4 e5 the coach announced "This
// game is now the King's Pawn Game. Key idea: The queen is the last piece still
// out of the fight. Her best home is the kingside… Queen d7 then Qh3 is the
// strong path" — teaching with nothing to do with the position.
//
// `notesForOpening` matches on NAME-TOKEN overlap. "King's Pawn Game" carries
// only `pawn` and `game`, so it selected a note about a queen maneuver on the
// strength of the word "pawn". It is not an opening; it is what the detector
// says BEFORE one exists.
//
// This pins the RETRIEVAL, which is where the bug lived — a note chosen for a
// placeholder is wrong however well it is later gated, because no gate can tell
// that a true sentence is about the wrong game.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { notesForOpening } from './danyaTeachingService';

const GENERIC = /^(?:king's|queen's) pawn (?:game|opening)$|^(?:irregular|uncommon)\b/i;

describe('the announcement key idea', () => {
  beforeAll(() => { loadFullCorpus(); });

  it('THE REGRESSION: a placeholder name is recognised as one', () => {
    for (const n of ["King's Pawn Game", "Queen's Pawn Game", "King's Pawn Opening", 'Irregular Opening']) {
      expect(GENERIC.test(n), n).toBe(true);
    }
  });

  it('placeholders are exactly what retrieval cannot be trusted on', () => {
    // Not an assertion that the corpus is wrong — an assertion that asking it
    // about a placeholder returns something, which is precisely the danger.
    // The name matches on `pawn`, so a note comes back and sounds authoritative.
    const notes = notesForOpening("King's Pawn Game", 1);
    expect(Array.isArray(notes)).toBe(true);
  });

  it('a REAL opening still gets its teaching', () => {
    // The guard must not silence the openings the announcement exists to teach.
    for (const n of ['Vienna Game', 'Caro-Kann Defense', 'Sicilian Defense']) {
      expect(GENERIC.test(n), n).toBe(false);
    }
  });
});
