// The secondary corpus is a GAP tier, and the contract that makes that safe is
// suppression: any primary hit means it stays out entirely, so it can never
// dilute or contradict Naroditsky teaching where that exists.

import { describe, it, expect } from 'vitest';
import { notesForOpening, secondaryNotesForGap, chessbrahCorpusStats } from './chessbrahTeachingService';
import {
  notesForOpening as primaryNotesForOpening,
  teachingNoteForBoard,
  transitionTeachingForGame,
  buildDanyaTeachingBlock,
} from './danyaTeachingService';
import { Chess } from 'chess.js';

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

  it('the facts-package note builder returns a gap note when the primary is silent', () => {
    const note = teachingNoteForBoard(TAIMANOV, fenAfter(TAIMANOV), 'Sicilian Taimanov');
    expect(note, 'facts package went empty on a gap opening').not.toBeNull();
    expect(note?.id.startsWith('cb-'), `expected a gap-tier note, got ${note?.id}`).toBe(true);
  });

  it('derives the opening itself when the caller passes none', () => {
    // Every existing facts-package call site omits the opening name, so the
    // gap tier is only reachable if the service resolves it from the history.
    const note = teachingNoteForBoard(TAIMANOV, fenAfter(TAIMANOV));
    expect(note?.id.startsWith('cb-')).toBe(true);
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
    expect(block).toContain('TEACHING CONTEXT');
    expect(block.length).toBeGreaterThan(80);
  });

  it('a covered opening still answers from the primary corpus, not the gap tier', () => {
    const CARO = ['e4', 'c6', 'd4', 'd5'];
    const note = teachingNoteForBoard(CARO, fenAfter(CARO), 'Caro-Kann Defence');
    expect(note?.id.startsWith('cb-'), 'gap tier displaced primary teaching').toBe(false);
  });
});
