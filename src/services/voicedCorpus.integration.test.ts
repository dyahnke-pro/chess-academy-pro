import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { __setFarmedCorporaCache } from './farmedCorpusData';
import { secondaryNotesForFen, warmSecondaryPositionIndexSync } from './secondaryCorpora';
import { noteAtPosition, teachingSourceForBoard } from './danyaTeachingService';

/**
 * A WIRE THAT DOES NOT FIRE IS NOT A WIRE (CLAUDE.md). This proves a voiced
 * teaching note actually comes OUT of the position-keyed corpus retrieval that
 * free-play / review / tactics use — not merely that the file exists.
 */
const bundle = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/voiced-teachings.json'), 'utf8'),
) as { notes: { id: string; lineSan: string[]; explains: string }[] };

function fenFor(lineSan: string[]): string {
  const g = new Chess();
  for (const s of lineSan) g.move(s);
  return g.fen();
}

describe('voiced corpus → position retrieval', () => {
  beforeEach(() => {
    __setFarmedCorporaCache([{ key: 'voiced', data: bundle as never }]);
    warmSecondaryPositionIndexSync();
  });
  afterEach(() => { __setFarmedCorporaCache(undefined); });

  it('has real position-keyed notes to deliver', () => {
    const positioned = bundle.notes.filter((n) => n.lineSan.length > 0);
    expect(positioned.length).toBeGreaterThan(100);
  });

  it('delivers a voiced note by EXACT position for several real notes', () => {
    // sample across the corpus so we do not lean on one video.
    const sample = bundle.notes.filter((n) => n.lineSan.length >= 4).filter((_, i) => i % 40 === 0).slice(0, 8);
    expect(sample.length).toBeGreaterThan(2);
    let hits = 0;
    for (const n of sample) {
      const fen = fenFor(n.lineSan);
      const got = secondaryNotesForFen(fen);
      if (got.some((g) => g.id.startsWith('vc-'))) hits += 1;
    }
    // every sampled position must return a voiced note (its own note, at least).
    expect(hits).toBe(sample.length);
  });

  it('delivers the KIA-vs-French note at its board', () => {
    const kf = bundle.notes.find((n) => n.explains.toLowerCase().includes('king') && n.explains.toLowerCase().includes('d2'));
    expect(kf, 'a KIA note about the d2 knight should exist').toBeTruthy();
    const got = secondaryNotesForFen(fenFor(kf!.lineSan));
    expect(got.some((g) => g.id === kf!.id)).toBe(true);
  });
});

/**
 * WIRE-FIRES PER PLAY SURFACE (David 2026-08-26). Voiced is the sole exact-
 * position narration now; these prove a voiced note comes OUT of the exact
 * selection functions the play surfaces call — and that a floating note never
 * does. `noteAtPosition` is the review (mistakeNarration) + teach/free-play
 * splice (openingGenerator) path; `teachingSourceForBoard` is the read-position,
 * think-aloud, and tactics-exact path (and its position tier is what phase-
 * narration keeps).
 */
describe('voiced fires on the play surfaces; floating stays out', () => {
  const anchored = bundle.notes.find((n) => n.lineSan.length >= 5)!;
  const fen = fenFor(anchored.lineSan);

  beforeEach(() => {
    __setFarmedCorporaCache([{ key: 'voiced', data: bundle as never }]);
    warmSecondaryPositionIndexSync();
  });
  afterEach(() => { __setFarmedCorporaCache(undefined); });

  it('noteAtPosition (review / teach / free-play splice) returns the voiced note', () => {
    expect(noteAtPosition(anchored.lineSan, fen)?.id).toBe(anchored.id);
  });

  it('teachingSourceForBoard (read-position / think-aloud / tactics-exact) returns it as origin=position', () => {
    const src = teachingSourceForBoard(anchored.lineSan, fen);
    expect(src?.note.id).toBe(anchored.id);
    expect(src?.origin).toBe('position');
  });

  it('never yields a FLOATING note on a play surface', () => {
    const floating = {
      id: 'vc-floattest', lineSan: [], opening: 'Ruy Lopez', phase: 'opening',
      explains: 'A general Ruy idea about the centre.', teaches: '', plans: '',
      concepts: ['center-control'], sources: ['yt:x'],
    };
    __setFarmedCorporaCache([{ key: 'voiced', data: { notes: [...bundle.notes, floating] } as never }]);
    warmSecondaryPositionIndexSync();
    const ruySans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
    const src = teachingSourceForBoard(ruySans, fenFor(ruySans), 'Ruy Lopez');
    // Silence is fine; a floating note surfacing is not.
    if (src) {
      expect(src.origin).toBe('position');
      expect(src.note.id).not.toBe('vc-floattest');
    }
  }, 30_000); // re-warms the (large) voiced index inside the test
});
