// The 2026-08-06 tactic-vocabulary expansion — five new geometries, each
// pinned to a position that PLAINLY shows it and a quiet near-miss that must
// stay silent. Same bar as the board-concepts vocabulary gate: a detector
// that cries wolf gets tuned out, which is worse than a narrow one.
import { describe, it, expect } from 'vitest';
import { detectTactics } from './tacticsDetector';

const types = (fen: string): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  for (const t of detectTactics(fen).tactics) {
    m.set(t.type, [...(m.get(t.type) ?? []), `${t.beneficiary}:${t.description}`]);
  }
  return m;
};

describe('expanded tactic geometries', () => {
  it('mate_threat: back-rank mate-in-1 detected, start position silent', () => {
    // White Ra1 vs bare Black king on g8 behind pawns — Ra8# available.
    const t = types('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(t.has('mate_threat')).toBe(true);
    expect(t.get('mate_threat')?.[0]).toContain('w:');
    expect(types('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').has('mate_threat')).toBe(false);
  });

  it('back_rank: no-luft king with a heavy invader flags; luft silences it', () => {
    // Black king g8 boxed by f7/g7/h7, White rook can check on the rank —
    // but Ra8 IS mate here, so assert the weakness reads through either type.
    const boxed = types('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
    expect(boxed.has('back_rank') || boxed.has('mate_threat')).toBe(true);
    // Luft (…h6): no back-rank flag for Black anymore.
    const luft = types('6k1/5pp1/7p/8/8/8/5PPP/R5K1 w - - 0 1');
    expect(luft.get('back_rank')?.some((d) => d.startsWith('w:')) ?? false).toBe(false);
  });

  it('trapped_piece: a cornered attacked knight flags; a free knight does not', () => {
    // White Nh1: attacked by the g2-pawn (cheaper), and both escapes are
    // pawn-covered — f2 by e3, g3 by h4. Textbook stranded knight.
    const t = types('6k1/8/8/8/7p/4p3/6p1/1K5N w - - 0 1');
    expect(t.has('trapped_piece')).toBe(true);
    expect(types('6k1/8/8/8/4N3/8/6PP/6K1 w - - 0 1').has('trapped_piece')).toBe(false);
  });

  it('discovery: fires only WITH TEMPO — the unveiling move must check or win material', () => {
    // Rd1–Nd4–Qd8: the knight can capture the e6-bishop, unveiling the rook
    // on the queen at the same time. A real discovered attack.
    const withTempo = types('3q2k1/8/4b3/8/3N4/8/6PP/3R2K1 w - - 0 1');
    expect(withTempo.get('discovery')?.some((d) => d.startsWith('w:') && d.includes('d4')) ?? false).toBe(true);
    // Same geometry, no bishop: every knight move is quiet, so the shape is
    // decor — measured at 16% of real plies before the tempo rule. Silent.
    const noTempo = types('3q2k1/8/8/8/3N4/8/6PP/3R2K1 w - - 0 1');
    expect(noTempo.has('discovery')).toBe(false);
  });

  it('removal_of_guard: sole defender of an attacked piece is capturable', () => {
    // Black Nd4 is attacked by Rd1; its ONLY defender is the b6-bishop
    // (b6→c5→d4), and Rb1 attacks that bishop up the open b-file.
    const t = types('6k1/8/1b6/8/3n4/8/6PP/1R1R2K1 w - - 0 1');
    expect(t.get('removal_of_guard')?.some((d) => d.startsWith('w:')) ?? false).toBe(true);
  });

  it('every pattern carries a beneficiary', () => {
    for (const fen of ['6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', '3q2k1/8/8/8/3N4/8/6PP/3R2K1 w - - 0 1']) {
      for (const tac of detectTactics(fen).tactics) {
        expect(tac.beneficiary === 'w' || tac.beneficiary === 'b', `${tac.type} lacks a side`).toBe(true);
      }
    }
  });
});
