// The calculation line says why at the steps that force (g9 walk ply 34,
// 2026-09-27: "after O-O, Bd6, Nf4, Qh6, Re1+ arrives" read bare).
import { describe, it, expect } from 'vitest';
import { lineWithReasons } from './lineReasons';

describe('lineWithReasons', () => {
  // g9 after 17…Qg6: White to move, the student is Black.
  const FEN = '2r1kb1r/pp1b1ppp/6q1/3P1n2/1PB5/1P3N2/3BNPPP/R2QK2R w KQk - 5 18';
  it('marks the step that attacks the student and leaves quiet steps bare', () => {
    expect(lineWithReasons(FEN, ['O-O', 'Bd6', 'Nf4', 'Qh6'], 'b')).toBe('O-O, Bd6, Nf4 hitting your queen, Qh6');
  });
  it('NEGATIVE: the student\'s own moves never carry "hitting your"', () => {
    expect(lineWithReasons(FEN, ['O-O', 'Bd6'], 'b')).not.toMatch(/Bd6 hitting/);
  });
});
