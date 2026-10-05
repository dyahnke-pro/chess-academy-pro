import { describe, it, expect } from 'vitest';
import { getLibraryBook } from '../data/coachesLibrary';
import { THINKING_BOOK, bookTeachingFor, sourceStillThere } from './thinkingBookTeaching';
import type { ThinkingStep } from './thinkingSteps';

describe('thinking lessons teach the books\' ideas, grounded by page id', () => {
  for (const [step, idea] of Object.entries(THINKING_BOOK)) {
    it(`${step}: its source sentence is still on ${idea.source.bookId} ${idea.source.pageId}`, () => {
      expect(sourceStillThere(idea, getLibraryBook(idea.source.bookId))).toBe(true);
    });
    it(`${step}: the coach says it in its own words, not as a quote`, () => {
      expect(idea.teach).not.toMatch(/[“"]/);
      expect(idea.teach).not.toMatch(/Lasker|Capablanca|Nimzowitsch|Mason|Steinitz/);
    });
  }

  it('a step the books do not teach stays silent', async () => {
    expect(await bookTeachingFor('candidates' as ThinkingStep)).toBeNull();
  });

  it('the two habits the first four books left silent are now taught', async () => {
    expect(await bookTeachingFor('forcing-moves')).toMatch(/forc/);
    expect(await bookTeachingFor('answer-danger')).toMatch(/stop it/);
  });

  it('a moved source sentence is caught', () => {
    const idea = { ...THINKING_BOOK['hit-two']!, source: { ...THINKING_BOOK['hit-two']!.source, anchor: 'no such words' } };
    expect(sourceStillThere(idea, getLibraryBook(idea.source.bookId))).toBe(false);
  });
});
