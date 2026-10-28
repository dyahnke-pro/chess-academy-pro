// Hard-question walk 2026-10-11 (GothamChess–AlexOstrovskiy): 20.Qg3+ was
// "a blunder" with no why, and 21.e6 allowed mate with no line drawn.
import { describe, it, expect } from 'vitest';
import { backwardLook } from './backwardLook';
import { withOneSearch } from '../test/oneSearchScores';
import { NO_SECOND_READ } from './inaccuracyCall';

const before20 = '2r1qrk1/pp5p/8/4P3/4pN2/4P3/bPP2P1Q/2KR2N1 w - - 0 20';
const after20 = '2r1qrk1/pp5p/8/4P3/4pN2/4P1Q1/bPP2P2/2KR2N1 b - - 1 20';
const before21 = '2r1qr1k/pp5p/8/4P3/4pN2/4P1Q1/bPP2P2/2KR2N1 w - - 2 21';
const after21 = '2r1qr1k/pp5p/4P3/8/4pN2/4P1Q1/bPP2P2/2KR2N1 b - - 0 21';

describe('the why of a move that let them attack the king', () => {
  it('20.Qg3+: their checks in the line are the why, and the line is drawn', () => {
    const look = backwardLook(withOneSearch({
      fenBefore: before20, fenAfter: after20, playedSan: 'Qg3+', priorMove: null as never,
      bestSan: 'Nge2', bestPvUci: ['g1e2', 'f8f7', 'h2h4'],
      replyPvUci: ['g8h8', 'g3h3', 'a2b3', 'h3h6', 'b3c2', 'd1d6', 'c2b3', 'c1b1', 'c8c1', 'b1c1', 'e8c8', 'c1d2', 'c8c2', 'd2e1'],
      replySan: null, cpLoss: 460, studentColor: 'white', moverEvalAfterCp: -200,
    }))!;
    expect(look.line).toMatch(/^Qg3\+ was a blunder — it let them go after your king: …Bb3\+, …Rc1\+ and …Qc8\+\./);
    // What the better move did about it (P2, 2026-10-20): the square of the
    // hunt it covers — never "it would complete your development".
    expect(look.line).toContain('Nge2 was the move — it would guard c1, where their rook gives check in that line.');
    expect(look.punishLine?.uci[0]).toBe("c2b3");
    expect(look.punishLine?.uci).not.toContain("g3h3");
  });
  it('21.e6: the mate it allowed is drawn to the mate', () => {
    const look = backwardLook(withOneSearch({
      fenBefore: before21, fenAfter: after21, playedSan: 'e6', priorMove: null as never,
      bestSan: 'Nge2', bestPvUci: ['g1e2', 'c8c2'],
      replyPvUci: ['c8c2', 'c1c2', 'e8a4', 'c2c1', 'f8c8', 'c1d2', 'c8d8', 'f4d5', 'd8d5', 'd2c3', 'a4c4'],
      replySan: null, cpLoss: 99812, studentColor: 'white', allowedMate: 6, moverEvalAfterCp: null,
    }))!;
    // A mate past five moves is named by its first move, never an unfollowable
    // count. The better move is held: its line is too short to prove it stops
    // the mate, and "it would complete your development" is not the why.
    expect(look.line).toBe('e6 was a blunder — it let them force mate, starting with …Rxc2+.');
    expect(look.punishLine?.uci[0]).toBe('c8c2');
  });
});

describe('material in pieces, not points (David 2026-10-11)', () => {
  it('Qxh6+ in puzzle 08cOZ: "you lose a rook for a pawn", never "4 points down"', async () => {
    const { Chess } = await import('chess.js');
    const { errorWhyFor } = await import('./inaccuracyCall');
    const c = new Chess('4rr2/pp4pk/7p/8/P7/1q1P1NP1/3QP1K1/7R b - - 1 33'); c.move('Qe6');
    const w = errorWhyFor({ secondReads: NO_SECOND_READ, fenBefore: c.fen(), playedSan: 'Qxh6+', moverColor: 'white', replyLineUci: ['e6h6', 'h1h6', 'h7h6'], quality: 'mistake', tense: 'present' });
    expect(w?.line).toBe('That takes the pawn on h6, but the queen on e6 takes back — you lose a rook for a pawn.');
  });
});
