import { describe, it, expect } from 'vitest';
import { BOOK_CHIPS, bookChipForClaims } from './bookChips';
import { COACHES_LIBRARY } from './coachesLibrary';

describe('book chips — the books behind the computed facts', () => {
  it('every chip still points at a page that carries its passage', () => {
    for (const [id, chip] of Object.entries(BOOK_CHIPS)) {
      const book = COACHES_LIBRARY.find((b) => b.id === chip.bookId);
      expect(book, id).toBeDefined();
      const page = book!.pages[chip.page];
      expect(page, `${id} page ${chip.page}`).toBeDefined();
      expect(`${page.heading ?? ''} ${page.text}`.replace(/\s+/g, ' ').toLowerCase(), id).toContain(chip.anchor.toLowerCase());
    }
  });

  it('reads the concept off the claim key, first concept with a book wins', () => {
    expect(bookChipForClaims(['recapture-e5', 'concept:pin:c6e8g4'])).toEqual({
      type: 'read_book', id: 'nimzowitsch-my-system@33', label: 'Nimzowitsch on the pinned piece',
    });
    // fork is not in these books: no chip, rather than a wrong one.
    expect(bookChipForClaims(['concept:fork:c7e8a8'])).toBeNull();
    expect(bookChipForClaims([])).toBeNull();
  });
});
