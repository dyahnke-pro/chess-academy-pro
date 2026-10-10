import { describe, expect, it } from 'vitest';
import { assembleMoveEvalAnswer } from './groundedAnswer';

// Hard walk 2026-10-10, puzzle 0Fs8O: "What is the best move? Calculate the
// main line for me." answered Kd3 with no line — the line proved no mate or
// gain, so nothing reached the board, and "show me" / "explain that" had
// nothing to play.
describe('a quiet main line goes on the board', () => {
  const fen = '8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35';
  const pvSan = ['Kd3', 'Kd6', 'Kc4', 'Kc6', 'd5+', 'Kd6', 'Kb5'];
  it('carries the engine line as a walkable line, without reciting it', () => {
    const a = assembleMoveEvalAnswer({ fen, bestMoveUci: 'e3d3', evalCp: 495, mateIn: null, studentColor: 'white', pvSan });
    expect(a?.lines?.[0]?.plies.map((p) => p.san)).toEqual(pvSan);
    expect(a?.facts).toMatch(/main line is on the board/);
    expect(a?.facts, 'a depth-limited line is never recited as fact').not.toMatch(/Kc4/);
  });
});
