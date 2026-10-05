// bookChips — the books behind the coach's computed facts (David 2026-10-05:
// "Make sure the books are wired into narration calculators also" → "The chip
// is fine"). When a turn's computed fact is a concept a classic teaches well,
// a quiet chip under the coach's line opens the book at that page. Never
// spoken: book prose beside computed lines reads as two coaches (2026-09-23).
//
// HAND-CURATED, by reading each passage (2026-10-05). The searcher picked the
// rest wrongly — "back rank" landed on a rook ending, "discovered check" on the
// laws of the game — and fork / skewer / overload are not in these books at
// all. A concept with no good passage has NO chip: wrong is worse than none.
// Every entry is re-checked against the book text (`bookChips.test.ts`), so a
// re-ingested book that moves a page fails the build instead of misleading.

export interface BookChip {
  bookId: string;
  page: number;
  /** The chip's words: who, on what. */
  label: string;
  /** A phrase that must be on that page — the proof the chip still points at it. */
  anchor: string;
}

/** Keyed by the concept id the claim carries (`concept:<id>:<squares>`). */
export const BOOK_CHIPS: Readonly<Record<string, BookChip>> = {
  pin: { bookId: 'nimzowitsch-my-system', page: 33, label: 'Nimzowitsch on the pinned piece', anchor: 'pinned piece' },
  'knight-outpost': { bookId: 'nimzowitsch-my-system', page: 12, label: 'Nimzowitsch on the outpost', anchor: 'The outpost does not derive its strength from itself' },
  development: { bookId: 'nimzowitsch-my-system', page: 0, label: 'Nimzowitsch on development', anchor: 'Development is a collective conception' },
  'piece-activity': { bookId: 'edward-lasker-chess-and-checkers', page: 21, label: 'Edward Lasker on mobility', anchor: 'It is the mobility alone which decides the value of a man' },
  'rook-endgame': { bookId: 'capablanca-chess-fundamentals', page: 30, label: 'Capablanca on rook endings', anchor: 'endings of one Rook and Pawns' },
  'kp-vs-k': { bookId: 'capablanca-chess-fundamentals', page: 13, label: 'Capablanca on the opposition', anchor: 'the enormous value of the opposition' },
  'pawn-endgame': { bookId: 'capablanca-chess-fundamentals', page: 13, label: 'Capablanca on the opposition', anchor: 'the enormous value of the opposition' },
  'bishop-vs-knight': { bookId: 'capablanca-chess-fundamentals', page: 14, label: 'Capablanca on knight against bishop', anchor: 'the relative value of the Knight and the Bishop' },
  'passed-pawn': { bookId: 'nimzowitsch-my-system', page: 25, label: 'Nimzowitsch on the passed pawn', anchor: 'passed pawn is therefore a trump card' },
};

/** The chip for a turn, from the claims its computed facts carry (keys, never
 *  prose — G0). The first concept with a book wins; null when none has one. */
export function bookChipForClaims(claims: readonly string[]): { type: 'read_book'; id: string; label: string } | null {
  for (const c of claims) {
    const m = /^concept:([^:]+):/.exec(c);
    const chip = m ? BOOK_CHIPS[m[1]] : undefined;
    if (chip) return { type: 'read_book', id: `${chip.bookId}@${chip.page}`, label: chip.label };
  }
  return null;
}
