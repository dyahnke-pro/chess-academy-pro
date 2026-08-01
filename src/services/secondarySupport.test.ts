import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { secondarySupportNotes, secondaryNotesForGap } from './secondaryCorpora';
import { __setFarmedCorporaCache } from './farmedCorpusData';
import type { TeachingsBundle } from './secondaryCorpus';

// THE SUPPORT TIER (David 2026-08-01): "I want the notes to be able to cover
// gaps in any masterclass or Danya openings we teach. Splice them in anywhere
// there is a gap or where they can be used even when either of these two have
// primary teachings. A third source that supports at runtime."
//
// Before this, the farmed corpora were gated on OPENING-LEVEL primary coverage,
// which is too coarse: the primary corpus knows the Caro-Kann, so a farmed note
// on the Advance/Tal sub-line was suppressed even where the primary had nothing
// to say — and the caller fell through to STRUCTURE TRANSFER, borrowing a note
// from a different opening entirely.
//
// The contract this pins: support notes are available regardless of primary
// coverage, but they can only ever fill slots the primary left empty — the
// caller takes its primary notes first and asks for the remainder.

interface StubNote {
  id: string;
  lineSan: string[];
  opening: string;
  phase: string;
  explains: string;
  teaches: string;
  plans: string;
  sources: string[];
}

const note = (id: string, opening: string, lineSan: string[] = []): StubNote => ({
  id,
  lineSan,
  opening,
  phase: 'opening',
  explains: 'The pawn chain fixes the structure.',
  teaches: 'Undermine a pawn chain at its base.',
  plans: 'Prepare the break against the base.',
  sources: ['yt:abcdef1'],
});

const bundle = (notes: StubNote[]): TeachingsBundle => ({
  generatedAt: '2026-08-01',
  videosDistilled: 1,
  noteCount: notes.length,
  notes: notes as unknown as TeachingsBundle['notes'],
});

// A REAL opening the primary corpus covers at family level — that is exactly
// the case the old gate suppressed.
const COVERED = 'Caro-Kann Defense: Advance Variation, Tal Variation';

// The FARMED contribution only. chessbrah is a static secondary corpus and
// legitimately answers for the Caro-Kann too, so a bare [] assertion would be
// measuring chessbrah rather than the tier under test.
const farmed = (notes: Array<{ id: string }>): string[] =>
  notes.map((n) => n.id).filter((id) => id.startsWith('hp') || id.startsWith('sl'));

beforeEach(() => {
  __setFarmedCorporaCache([
    { key: 'hangingpawns', data: bundle([note('hp1', COVERED), note('hp2', COVERED, ['e4', 'c6', 'd4', 'd5', 'e5'])]) },
  ]);
});
afterEach(() => { __setFarmedCorporaCache(undefined); });

describe('secondary SUPPORT tier', () => {
  it('returns notes for an opening the primary corpus already covers', () => {
    expect(farmed(secondarySupportNotes({ openingName: COVERED, maxNotes: 4 }))).toContain('hp1');
  });

  it('is exactly what the OLD gap gate refused to return', () => {
    // primaryHits > 0 models "the primary corpus covers this opening".
    expect(secondaryNotesForGap({ openingName: COVERED, primaryHits: 1, maxNotes: 4 })).toEqual([]);
    expect(farmed(secondarySupportNotes({ openingName: COVERED, maxNotes: 4 })).length).toBeGreaterThan(0);
  });

  it('still fills a true gap, so gap coverage is not lost', () => {
    expect(farmed(secondarySupportNotes({ openingName: COVERED, maxNotes: 4 })).length).toBeGreaterThan(0);
    expect(farmed(secondaryNotesForGap({ openingName: COVERED, primaryHits: 0, maxNotes: 4 })).length).toBeGreaterThan(0);
  });

  it('honours the caller\'s remaining-slot budget, so it cannot crowd out primary teaching', () => {
    // The caller has already taken its primary notes and asks only for what is
    // left; a support tier that ignored this would dilute the house voice.
    expect(secondarySupportNotes({ openingName: COVERED, maxNotes: 1 })).toHaveLength(1);
    expect(secondarySupportNotes({ openingName: COVERED, maxNotes: 0 })).toHaveLength(0);
  });

  it('prefers a line-anchored note over an opening-name match', () => {
    // Ask for enough slots that chessbrah's own matches cannot crowd the farmed
    // note out; the ORDER is the contract — line-anchored ahead of name-matched.
    const ids = farmed(secondarySupportNotes({
      historySans: ['e4', 'c6', 'd4', 'd5', 'e5'],
      openingName: COVERED,
      maxNotes: 8,
    }));
    expect(ids[0]).toBe('hp2');
  });

  it('returns nothing for an opening no corpus carries', () => {
    expect(secondarySupportNotes({ openingName: 'Zzyzx Attack', maxNotes: 4 })).toEqual([]);
  });

  it('is quiet when the farmed corpora have not loaded yet', () => {
    __setFarmedCorporaCache(undefined);
    expect(farmed(secondarySupportNotes({ openingName: COVERED, maxNotes: 4 }))).toEqual([]);
  });
});
