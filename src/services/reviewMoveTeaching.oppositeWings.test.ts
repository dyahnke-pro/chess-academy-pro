import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// The Dragon, Yugoslav Attack: White castles long against Black's king on g8
// (the writers: "Both sides often use their pawns … to open lines on the side
// they are attacking").
const YUGOSLAV = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6'];
describe('castling onto the opposite wing', () => {
  it('O-O-O against a king on g8 says the kings are on opposite wings', () => {
    const t = buildReviewMoveTeachingFact(fenAfter(YUGOSLAV), 'O-O-O', true);
    expect(t?.text).toBe('The kings are on opposite wings now, c1 and g8, so each side can throw its pawns at the other king without opening its own.');
  });
  it('castling on the same wing keeps the shelter line', () => {
    const fen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'c3', 'O-O']);
    expect(buildReviewMoveTeachingFact(fen, 'O-O', true)?.text ?? '').toMatch(/king/i);
    expect(buildReviewMoveTeachingFact(fen, 'O-O', true)?.text ?? '').not.toMatch(/opposite wings/);
  });
});
