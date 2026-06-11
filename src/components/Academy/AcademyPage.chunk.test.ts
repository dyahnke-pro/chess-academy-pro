import { describe, it, expect } from 'vitest';
import { chunkForTts } from './AcademyPage';
import { PHILOSOPHY_OF_A_GENERAL } from '../../data/academy/philosophyOfAGeneral';

// /api/tts REJECTS any request over 3000 chars (api/tts.ts MAX_TEXT_LENGTH).
// The rewritten book chapters run 1.9k–4.3k chars, so a whole-chapter
// request silently returned nothing and the audiobook "wouldn't play"
// (David 2026-06-11). chunkForTts must keep every request under the cap.
const POLLY_CAP = 3000;

describe('chunkForTts', () => {
  it('returns the text unchanged when already under the cap', () => {
    expect(chunkForTts('Short sentence.')).toEqual(['Short sentence.']);
  });

  it('keeps every chunk under the Polly 3000-char cap', () => {
    const long = Array.from({ length: 60 }, (_, i) => `This is sentence number ${i} in a very long chapter of prose.`).join(' ');
    expect(long.length).toBeGreaterThan(POLLY_CAP);
    const chunks = chunkForTts(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(POLLY_CAP);
  });

  it('preserves all the prose (no dropped text) across the split', () => {
    const long = Array.from({ length: 80 }, (_, i) => `Sentence ${i} here.`).join(' ');
    const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
    expect(norm(chunkForTts(long).join(' '))).toBe(norm(long));
  });

  it('hard-splits a single sentence longer than the cap', () => {
    const huge = `${'word '.repeat(800)}.`; // ~4000 chars, no sentence break
    expect(huge.length).toBeGreaterThan(POLLY_CAP);
    const chunks = chunkForTts(huge);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(POLLY_CAP);
  });

  it('every real book chapter chunks to under-cap segments (the bug that broke play)', () => {
    for (const ch of PHILOSOPHY_OF_A_GENERAL.chapters) {
      const text = `${ch.title}. ${ch.paragraphs.join(' ')}`;
      const chunks = chunkForTts(text);
      expect(chunks.length).toBeGreaterThan(0);
      for (const c of chunks) expect(c.length).toBeLessThanOrEqual(POLLY_CAP);
    }
  });
});
