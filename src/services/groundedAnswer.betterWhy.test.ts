import { describe, expect, it } from 'vitest';
import { assembleCandidateMoveAnswer } from './groundedAnswer';

// White to move; the engine prefers Bxf6 (the bishop takes the knight). The
// student asks about h3 instead.
const FEN = 'rnbqkb1r/pppp1ppp/5n2/4P1B1/8/8/PPP2PPP/RN1QKBNR w KQkq - 0 1';

describe('a named move that is not the best comes with WHY the best is better (2026-10-08)', () => {
  it('names the better move AND its reason', () => {
    const a = assembleCandidateMoveAnswer({ fen: FEN, candidateSan: 'h3', bestMoveUci: 'e5f6', bestEvalCp: 300, candidateEvalCp: 0, candidateLineUci: [], candidateSettled: true, studentColor: 'white' });
    const facts = a?.facts ?? '';
    console.log(facts);
    expect(facts).toMatch(/exf6 wins the knight on f6\./);
    expect(facts.match(/exf6/g)?.length).toBe(2);
  });
  it('a move close to the best does not lecture about the alternative', () => {
    const a = assembleCandidateMoveAnswer({ fen: FEN, candidateSan: 'Bxf6', bestMoveUci: 'e5f6', bestEvalCp: 300, candidateEvalCp: 290, candidateLineUci: [], candidateSettled: true, studentColor: 'white' });
    expect(a?.facts ?? '').not.toMatch(/exf6 wins/);
  });
});
