import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { COACHES_LIBRARY } from './coachesLibrary';

// The Library ships to market: every living board must be a LEGAL position whose
// moves replay move-for-move (no misread diagram, no bad notation conversion),
// and every book must carry a complete public-domain citation.

describe('Coaches Library — integrity + citations', () => {
  it('has books', () => {
    expect(COACHES_LIBRARY.length).toBeGreaterThan(0);
  });

  for (const book of COACHES_LIBRARY) {
    describe(book.id, () => {
      it('carries a complete public-domain citation (market-ready)', () => {
        const c = book.citation;
        expect(book.bookTitle.length).toBeGreaterThan(0);
        expect(book.author.length).toBeGreaterThan(0);
        expect(c.edition.length).toBeGreaterThan(0);
        expect(c.rights.length).toBeGreaterThan(0);
        expect(c.sourceLabel.length).toBeGreaterThan(0);
        expect(c.sourceUrl).toMatch(/^https:\/\//);
      });

      it('every living board is legal and replays its line', () => {
        for (const page of book.pages) {
          const board = page.board;
          if (!board) continue;
          expect(() => new Chess(board.fen)).not.toThrow();
          const game = new Chess(board.fen);
          for (const san of board.moves) {
            const applied = game.move(san);
            expect(applied, `illegal ${san} in ${book.id}/${page.id}`).toBeTruthy();
          }
        }
      });

      it('every page has non-empty book text', () => {
        for (const page of book.pages) {
          expect(page.text.trim().length).toBeGreaterThan(0);
        }
      });
    });
  }
});
