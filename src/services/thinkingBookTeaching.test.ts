import { describe, it, expect } from 'vitest';
import { getLibraryBook } from '../data/coachesLibrary';
import { THINKING_BOOK, bookSpan, bookTeachingFor } from './thinkingBookTeaching';
import type { ThinkingStep } from './thinkingSteps';

describe('thinking lessons quote the books verbatim, by page id', () => {
  for (const [step, cite] of Object.entries(THINKING_BOOK)) {
    it(`${step}: the cited span is on ${cite!.bookId} ${cite!.pageId}`, () => {
      const span = bookSpan(cite!, getLibraryBook(cite!.bookId));
      expect(span, `${step} quote is no longer on its page — re-cite it, never search`).not.toBeNull();
      // Verbatim: the span (case aside for the first letter) is a substring of the page.
      const page = getLibraryBook(cite!.bookId)!.pages.find((p) => p.id === cite!.pageId)!;
      expect(page.text.replace(/\s+/g, ' ').toLowerCase()).toContain(span!.toLowerCase());
      expect(span!.length).toBeLessThan(600);
    });
  }

  it('a step the books do not teach stays silent', async () => {
    expect(await bookTeachingFor('forcing-moves' as ThinkingStep)).toBeNull();
    expect(await bookTeachingFor('answer-danger' as ThinkingStep)).toBeNull();
  });

  it('the spoken line names the book and quotes it', async () => {
    const line = await bookTeachingFor('their-targets');
    expect(line).toMatch(/Edward Lasker, in Chess Strategy, on counting: “.*count the number of attacking and defending units/);
  });

  it('a moved anchor returns null, never a nearby guess', () => {
    const cite = { ...THINKING_BOOK['hit-two']!, from: 'no such words anywhere' };
    expect(bookSpan(cite, getLibraryBook(cite.bookId))).toBeNull();
  });
});
