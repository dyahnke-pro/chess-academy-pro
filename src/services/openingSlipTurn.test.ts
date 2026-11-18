// THE CORRECTION CARRIES THE BOOK (David 2026-11-18: "I like the first idea" —
// a book departure that costs is said inside the correction: why it was
// inaccurate, and what theory plays instead). No separate "you left the book".
import { describe, it, expect } from 'vitest';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { decideTurn, type LaneFixture } from '../test/learnDoorFixtures';

const FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/N4N2/PPPP1PPP/R1BQK2R b KQkq - 3 4';
const verdict: LaneFixture = { lane: 'mistake', text: 'Your move was an inaccuracy: the knight on a3 does nothing for the centre.', fen: FEN, squares: ['a3'], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE };
const book: LaneFixture = { lane: 'bookMove', text: 'That left the book: theory plays c3 here, to back up d4 and take the centre.', fen: FEN, squares: ['c3', 'd4'], proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE, role: 'teach' };
const turn = { kind: 'late' as const, ply: 6, slipCp: 65, priceSettled: true, price: null, midExchange: null, decision: null };

describe('a costly book departure', () => {
  it('speaks the why and the book move together', () => {
    const d = decideTurn([verdict, book], '', undefined, null, null, false, turn);
    expect(d.spoke).toContain('mistake');
    expect(d.spoke).toContain('bookMove');
  });
  it('a departure that costs nothing says no book line', () => {
    const d = decideTurn([book], '', undefined, null, null, false, { ...turn, slipCp: null });
    expect(d.spoke).not.toContain('bookMove');
  });
});
