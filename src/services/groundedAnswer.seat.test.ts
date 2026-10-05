/**
 * ONE PERSPECTIVE IN ANSWERS — question walk 2026-09-27, 1200 Sicilian after
 * 12…Qc8, student White: "What should I play here?" → "White is clearly
 * better" to the White player. The seat is now a REQUIRED field on every
 * answer builder that voices an eval, so a caller cannot forget it.
 */
import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer, assembleCandidateMoveAnswer } from './groundedAnswer';

const FEN = 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13';

describe('the eval is said to the student as you/they', () => {
  it('best move: "you\'re clearly better", never "White is"', () => {
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'd1c1', evalCp: 100, studentColor: 'white' });
    expect(a?.facts).toMatch(/you're up about [0-9.]+ points — clearly better/i);
    expect(a?.facts).not.toMatch(/\bwhite is\b/i);
  });
  it('candidate: the line\'s eval is seated too', () => {
    const a = assembleCandidateMoveAnswer({ fen: FEN, candidateSan: 'e5', bestMoveUci: 'd1c1', bestEvalCp: 100, candidateEvalCp: 20, candidateLineUci: [], candidateSettled: true, studentColor: 'white' });
    expect(a?.facts ?? '').not.toMatch(/\bwhite is\b/i);
  });
  it('NEGATIVE CONTROL: with no seat known, the colour is the honest fallback', () => {
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'd1c1', evalCp: 100, studentColor: null });
    expect(a?.facts).toMatch(/white is clearly better/i);
  });
});
