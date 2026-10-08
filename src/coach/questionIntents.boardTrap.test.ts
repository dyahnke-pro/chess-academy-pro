import { describe, expect, it } from 'vitest';
import { buildQuestionGrounding } from './questionIntents';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('a trap question about the board is the board\'s tactics scan (2026-10-08)', () => {
  it.each(['Is there a trap in this position?', 'Can you search for traps here?'])('"%s" with a board → tactics', (q) => {
    const g = buildQuestionGrounding(q, { fen: FEN });
    expect(g.tacticsQuestion).toBe(true);
    expect(g.openingTrapsQuestion).toBeFalsy();
  });
  it('an opening\'s traps, asked by name, are still the opening\'s traps', () => {
    expect(buildQuestionGrounding('What traps are in the Italian?', { fen: FEN }).openingTrapsQuestion).toBe(true);
  });
});
