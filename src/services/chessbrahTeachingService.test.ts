// The secondary corpus is a GAP tier, and the contract that makes that safe is
// suppression: any primary hit means it stays out entirely, so it can never
// dilute or contradict Naroditsky teaching where that exists.

import { describe, it, expect } from 'vitest';
import { notesForOpening, secondaryNotesForGap, secondaryNotesForPosition, chessbrahCorpusStats } from './chessbrahTeachingService';
import {
  notesForOpening as primaryNotesForOpening,
  teachingNoteForBoard,
  transitionTeachingForGame,
  buildDanyaTeachingBlock,
  noteAtPosition,
} from './danyaTeachingService';
import { Chess } from 'chess.js';

// 🔒 THE GAP CORPUS IS FLOATING-ONLY SINCE 2026-08-26, and four assertions in
// this file outlived that change — they have been red on main ever since,
// blocking every push, while asserting a contract the app deliberately retired.
//
// Two things happened that day, both on David's instruction ("make sure I hear
// no floating notes in the play surfaces — make them stay where they belong"):
//   1. The ANCHORED farmed notes were archived, so every one of chessbrah's
//      2,766 notes now SHIPS with no `lineSan`. Measured, not assumed:
//      `chessbrah-teachings.json` has 2,766 notes and 0 anchored. Eighteen get
//      a line back at load time from the derived-anchor sidecar
//      (`note-anchors.json`, 1,031 entries, 18 of them `cb-`), and those 18 are
//      still refused by `noteAtPosition` — a derived anchor has no
//      `positionSource`, which `isVerifiedPosition` reads as inferred.
//   2. `teachingSourceForBoard` became EXACT-POSITION ONLY — the
//      opening-family / structure / concept tiers were removed from it.
//
// Together those make "a chessbrah note comes back from `teachingNoteForBoard`"
// impossible by construction. The tests below now assert the contract that
// actually holds, and the retired claims are DELETED rather than annotated, so
// a future reader cannot pick the wrong one of two statements.
//
// Where the gap corpus DOES still reach the student: `secondaryNotesForGap` by
// opening name, the phase-transition ritual, `buildDanyaTeachingBlock` as
// LESSON BACKGROUND, and the tactics/endgame concept tiers. Each is asserted.

describe('chessbrahTeachingService — gap tier', () => {
  it('has a corpus', () => {
    expect(chessbrahCorpusStats().notes).toBeGreaterThan(0);
  });

  it('stays silent whenever the primary corpus has anything', () => {
    for (const hits of [1, 2, 5]) {
      expect(secondaryNotesForGap({ openingName: 'Sicilian Taimanov', primaryHits: hits })).toEqual([]);
    }
  });

  it('covers an opening the primary corpus is silent on', () => {
    // The Taimanov is one of the measured gaps: the primary has no notes for it,
    // and the second creator ran a 21-part series on it.
    expect(primaryNotesForOpening('Sicilian Taimanov', 5)).toEqual([]);
    const gap = secondaryNotesForGap({ openingName: 'Sicilian Taimanov', primaryHits: 0, maxNotes: 2 });
    expect(gap.length).toBeGreaterThan(0);
    expect(gap.every((n) => /taimanov/i.test(n.opening ?? ''))).toBe(true);
  });

  it('never matches on a generic token alone', () => {
    const hits = notesForOpening('Réti Opening', 40);
    expect(hits.filter((n) => /Ponziani|Catalan|Bishop's Opening/i.test(n.opening ?? ''))).toEqual([]);
  });

  it('returns nothing for an opening neither corpus teaches', () => {
    expect(secondaryNotesForGap({ openingName: 'Grob Opening: Fritz Gambit', primaryHits: 0 })).toEqual([]);
  });
});

// The wiring contract: gap-tier notes must reach the GROUNDED FACTS package the
// coach hands the model (thinkAloud / step narration / phase transition) and the
// chat block Play-with-Coach answers from — not just sit in the corpus file.
describe('gap tier reaches the packages the coach hands the LLM', () => {
  // A Taimanov the primary corpus does not cover.
  const TAIMANOV = ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'];
  const fenAfter = (sans: string[]): string => {
    const c = new Chess();
    for (const s of sans) c.move(s);
    return c.fen();
  };

  it('the board-keyed builder NEVER reaches the gap tier — that is the guarantee', () => {
    // This asserted the opposite until 2026-09-17. `teachingSourceForBoard` is
    // exact-position only, and the gap corpus has no positions, so a floating
    // note reaching a play surface would be the defect David named — prose
    // about a different board, spoken as if it described this one.
    for (const opening of ['Sicilian Taimanov', null]) {
      const note = teachingNoteForBoard(TAIMANOV, fenAfter(TAIMANOV), opening, null);
      expect(
        note?.id.startsWith('cb-') ?? false,
        `a floating gap note reached a play surface: ${note?.id}`,
      ).toBe(false);
    }
  });

  it('the phase-transition ritual never goes quiet on a gap opening', () => {
    // A note anchored on THIS game's own line outranks the gap tier by design —
    // the tier order is position, then recent path, then family, then gap. What
    // matters here is that the ritual always has teaching to speak.
    const note = transitionTeachingForGame({
      historySans: TAIMANOV,
      fen: fenAfter(TAIMANOV),
      openingName: 'Sicilian Taimanov',
    });
    expect(note, 'phase transition went silent').not.toBeNull();
    expect(note?.plans?.trim().length).toBeGreaterThan(0);
  });

  it('the transition ritual reaches the gap tier when every primary tier is empty', () => {
    // No position and no path, and a name the primary corpus cannot match even
    // at family level — so tiers 1-3 are empty and only the gap tier can answer.
    const note = transitionTeachingForGame({ historySans: [], openingName: 'Sicilian Kan / Taimanov' });
    expect(note?.id.startsWith('cb-'), `expected a gap-tier note, got ${note?.id}`).toBe(true);
    expect(note?.plans?.trim().length).toBeGreaterThan(0);
  });

  it('the chat block Play answers from carries the gap teaching', () => {
    const block = buildDanyaTeachingBlock({
      historySans: TAIMANOV,
      openingName: 'Sicilian Taimanov',
      fen: fenAfter(TAIMANOV),
    });
    // The header says LESSON BACKGROUND, not "teaching context for this
    // position" (2026-08-04). This block mixes opening-level notes with
    // position-keyed ones, and the old wording invited the model to write any
    // of them up as a fact about the board in front of the student.
    expect(block).toContain('LESSON BACKGROUND');
    expect(block).toContain('NOT claims about the current position');
    expect(block.length).toBeGreaterThan(80);
  });

  it('a covered opening still answers from the primary corpus, not the gap tier', () => {
    const CARO = ['e4', 'c6', 'd4', 'd5'];
    const note = teachingNoteForBoard(CARO, fenAfter(CARO), 'Caro-Kann Defence', null);
    // `?? false` because null is a perfectly good answer here — the assertion is
    // "not a gap note", and the board tier being silent satisfies it. Without
    // the coalesce this read `expected undefined to be false` and failed on a
    // pass.
    expect(note?.id.startsWith('cb-') ?? false, 'gap tier displaced primary teaching').toBe(false);
  });
});

describe('the gap corpus is floating-only, and stays out of the position tier', () => {
  it('ships floating, and only the derived sidecar gives any of it a line', () => {
    const stats = chessbrahCorpusStats();
    expect(stats.notes, 'the corpus is empty — every check here would be vacuous').toBeGreaterThan(1000);
    // 18, not 0: the shipped bundle carries no `lineSan` at all, and
    // `createSecondaryCorpus` applies `applyDerivedAnchors` before building its
    // indexes. Pinned rather than bounded, so BOTH directions are visible — a
    // re-farm that renumbered ids would drop it toward 0, and a corpus that
    // regrew real anchors would push it up.
    expect(stats.positioned, 'the derived-anchor overlap moved — check note-anchors.json ids').toBe(18);
  });

  it('even a derived-anchor note is refused by the position tier', () => {
    // `cb-194` is one of the 18, anchored at the Taimanov by the sidecar. It IS
    // findable by prefix — and `noteAtPosition` still will not serve it,
    // because a derived anchor carries no `positionSource` and
    // `isVerifiedPosition` treats a missing one as inferred. That is the whole
    // guarantee: an inferred position may never be spoken as a claim about the
    // board in front of the student.
    const line = ['e4', 'c5', 'Nf3', 'e6'];
    const found = secondaryNotesForPosition(line);
    expect(found.some((n) => n.id === 'cb-194'), 'the sidecar anchor stopped resolving').toBe(true);
    const spliced = noteAtPosition(line, undefined, null, null);
    expect(spliced?.id.startsWith('cb-') ?? false, `an inferred-position gap note was served: ${spliced?.id}`).toBe(false);
  });
});
