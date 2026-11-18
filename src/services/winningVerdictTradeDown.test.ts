import { describe, it, expect } from 'vitest';
import { assemblePositionAssessment } from './groundedAnswer';

// Danya article boards 2026-11-18: "Decisive. Trade pieces, not pawns." was one
// of four rotated winning stems, picked by the eval whatever the material —
// said a rook down with a pawn about to queen, and on a Greek gift with the
// material level. It is advice for the side ahead in material.
const read = (fen: string, evalCp: number, bestUci: string): string =>
  assemblePositionAssessment({ tempting: null, evalCp, mateIn: null, studentColor: fen.split(' ')[1] === 'w' ? 'white' : 'black', fen, bestUci })?.facts ?? '';

describe('"trade pieces, not pawns" only when the student is ahead in material', () => {
  it('a rook down, winning by queening: never "trade pieces"', () => {
    expect(read('8/8/1KP5/3r4/8/8/8/k7 w - - 0 1', 263, 'c6c7')).not.toMatch(/Trade pieces, not pawns/);
  });
  it('a Greek gift with material level: never "trade pieces"', () => {
    expect(read('r1bq1rk1/pp1n1ppp/2n1p3/3pP3/3P4/P1PB1N2/5PPP/R1BQ1RK1 w - - 0 1', 319, 'd3h7')).not.toMatch(/Trade pieces, not pawns/);
  });
  it('still said a bishop up and winning', () => {
    expect(read('1r3qk1/5pp1/2Q4p/3B4/8/5R2/5PPP/6K1 w - - 0 1', 511, 'h2h3')).toMatch(/^Decisive\. Trade pieces, not pawns\./);
  });
});
