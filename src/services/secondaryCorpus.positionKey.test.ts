import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { createSecondaryCorpus, type TeachingsBundle } from './secondaryCorpus';
import { positionOf } from '../utils/samePosition';
import type { DanyaNote } from './danyaTeachingService';

// Review freeze, 2026-10-21: whenever the voiced corpus landed, the app replayed
// all 7,477 of its lines with chess.js to index them by position — ~20 s of the
// screen on a profiled Review walk. The builder now stamps each note's position
// (`positionKey`) and the index reads it.

const VOICED = JSON.parse(readFileSync(join(__dirname, '../../public/data/voiced-teachings.json'), 'utf8')) as TeachingsBundle;

const note = (over: Partial<DanyaNote>): DanyaNote => ({
  id: 'vc-test-1', lineSan: [], opening: null, phase: 'opening', explains: 'x', teaches: '', plans: '',
  concepts: [], sources: [], positionSource: 'high', studentSide: 'white', ...over,
});

describe('the corpus index reads each note\'s stamped position', () => {
  it('indexes by positionKey without replaying the line', () => {
    // A line that cannot be replayed: only the stamp can place this note.
    const key = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -';
    const corpus = createSecondaryCorpus('t', {
      generatedAt: '', videosDistilled: 1, noteCount: 1,
      notes: [note({ lineSan: ['e4', 'Ke9'], positionKey: key })],
    });
    corpus.warmFenIndexSync();
    expect(corpus.notesForFen(`${key} 0 2`).map((n) => n.id)).toEqual(['vc-test-1']);
  });

  it('a note without the stamp is still replayed', () => {
    const corpus = createSecondaryCorpus('t', {
      generatedAt: '', videosDistilled: 1, noteCount: 1,
      notes: [note({ lineSan: ['e4', 'e5'] })],
    });
    corpus.warmFenIndexSync();
    const c = new Chess();
    c.move('e4'); c.move('e5');
    expect(corpus.notesForFen(c.fen()).map((n) => n.id)).toEqual(['vc-test-1']);
  });
});

describe('the shipped voiced corpus carries the stamp, and it is the board the line reaches', () => {
  it('every positioned note is stamped', () => {
    const missing = VOICED.notes.filter((n) => n.lineSan.length > 0 && !n.positionKey).map((n) => n.id);
    expect(missing).toEqual([]);
  });

  it('the stamp equals a fresh replay (every 20th note)', () => {
    const wrong: string[] = [];
    VOICED.notes.forEach((n, i) => {
      if (i % 20 !== 0 || n.lineSan.length === 0) return;
      const c = new Chess();
      for (const san of n.lineSan) c.move(san);
      if (positionOf(c.fen()) !== n.positionKey) wrong.push(n.id);
    });
    expect(wrong).toEqual([]);
  });
});
