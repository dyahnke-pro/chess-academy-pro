import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { compareTwoMoves, type Evaluate } from './moveComparison';

// Review walk 2026-10-04, G3 (lichess mZ1GOTOw) 19…cxb6: "Why axb6 was better —
// your passed pawn on c7 — take it off the board and the edge is gone", heard
// over the board after cxb6 where c7 is EMPTY. The passer exists only on the
// better move's board, so the reason says so.
const FEN = 'r6r/p1p1kpp1/1Pp3np/2N1P3/8/P4N2/1B3PPP/R4K2 b - - 0 19';

describe('a passed-pawn reason is said of the better move', () => {
  it('names the move that creates it and the one that does not', async () => {
    // Stub engine: Black is better while a black pawn stands on c7, worse otherwise.
    const evaluate: Evaluate = async (fen) => ({ cp: new Chess(fen).get('c7')?.type === 'p' ? -150 : 50, pv: [] });
    const r = await compareTwoMoves(FEN, 'axb6', 'cxb6', evaluate);
    expect(r?.delta?.kind).toBe('passed-pawn');
    expect(r!.delta!.text).not.toMatch(/^your passed pawn/);
    expect(r!.delta!.text).toMatch(/passed pawn on c7 that cxb6 does not/);
  });
});

// Clean-pass review walk 2026-10-04, G3 20…Rad8: "Why c5 was better — it leaves
// you a passed pawn on c5 that Rad8 does not — take that pawn off the board and
// the edge is gone". Rad8 keeps the SAME passer on c6, and Black stood at −1.9:
// there was no edge. A pushed passer is not a created one.
describe('a passer the better move only pushes is not one it creates', () => {
  it('c5 vs Rad8: no passed-pawn reason, and never "the edge"', async () => {
    const fen = 'r6r/p3kpp1/1pp3np/4P3/4N3/P4N2/1B3PPP/R4K2 b - - 1 20';
    // Stub: the c-pawn on c5 is worth a lot, so the old square-match fired.
    const evaluate: Evaluate = async (f) => ({ cp: new Chess(f).get('c5')?.type === 'p' ? 180 : 260, pv: [] });
    const r = await compareTwoMoves(fen, 'c5', 'Rad8', evaluate);
    expect(r?.delta?.kind ?? null).not.toBe('passed-pawn');
    expect(r?.delta?.text ?? '').not.toMatch(/edge is gone/);
  });
});

// Clean-pass review walk 2026-10-04, G2 23…exd5: "it leaves you a passed pawn
// on d5 that Nf2+ does not" — and the engine's answer is Nxd5. A pawn the reply
// takes at once was never a passer.
describe('a passer the reply takes at once is not a passer', () => {
  it('exd5 vs Nf2+: Nxd5 removes it, so it is not the reason', async () => {
    const fen = 'r4rk1/pp1b2pp/1q2p3/3PPp2/6nP/2N2Nb1/PPB1Q1P1/R4R1K b - - 2 23';
    const evaluate: Evaluate = async (f) => {
      const c = new Chess(f);
      // Black's d5 pawn worth a lot on any board; White answers exd5 with Nxd5.
      const cp = c.get('d5')?.color === 'b' ? -300 : -100;
      return { cp, pv: c.get('d5')?.color === 'b' && c.turn() === 'w' ? ['c3d5'] : [] };
    };
    const r = await compareTwoMoves(fen, 'exd5', 'Nf2+', evaluate);
    expect(r?.delta?.kind ?? null).not.toBe('passed-pawn');
  });
});
