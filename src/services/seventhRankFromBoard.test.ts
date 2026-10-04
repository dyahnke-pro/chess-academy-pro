import { describe, expect, it } from 'vitest';
import { detectConcept } from './reviewConcepts';

// Review walk 2026-10-04, game am-SI5q0VJz, 33.Rc7+: "Your rook reaches the
// 7th rank — the pigs on the seventh. It rakes their pawns from behind and
// pins their king to the back rank." The king stood on e7, on the seventh,
// and no pawn of theirs was on that rank.
describe('the seventh-rank beat is read off the board', () => {
  it('says nothing it cannot see: no raked pawn, no king on the back rank', () => {
    const before = '2Rn3r/4k1pp/5q2/3B4/6Q1/P4N2/5PPP/6K1 w - - 3 33';
    const after = '3n3r/2R1k1pp/5q2/3B4/6Q1/P4N2/5PPP/6K1 b - - 4 33';
    const beat = detectConcept({ fenBefore: before, fenAfter: after, san: 'Rc7+', moverColor: 'w', studentColor: 'w', evalBefore: 300, evalAfter: 300, priorMove: null });
    expect(beat?.text ?? '').not.toMatch(/back rank|pigs|pawns from behind/);
  });
  it('names the pawns it hits and the king it shuts in', () => {
    const before = '6k1/5ppp/8/8/8/8/2R2PPP/6K1 w - - 0 1';
    const after = '6k1/2R2ppp/8/8/8/8/5PPP/6K1 b - - 1 1';
    const beat = detectConcept({ fenBefore: before, fenAfter: after, san: 'Rc7', moverColor: 'w', studentColor: 'w', evalBefore: 300, evalAfter: 300, priorMove: null });
    expect(beat?.text).toMatch(/rakes their pawn on f7/);
    expect(beat?.text).toMatch(/keeps their king shut on the back rank/);
  });
});
