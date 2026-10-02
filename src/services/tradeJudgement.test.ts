import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tradeJudgement } from './tradeJudgement';
import type { PieceValue } from './pieceValueRead';

const at = (moves: string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };

describe('tradeJudgement (P3, T3)', () => {
  it('silent on an even trade with nothing to say — the Ruy exchange', () => {
    expect(tradeJudgement(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6']), 'Bxc6', 'dxc6', 'w', 0)).toBeNull();
  });
  it('silent without a recapture on the same square', () => {
    expect(tradeJudgement('4k3/8/5n2/3n4/8/2N5/8/R3K3 w - - 0 1', 'Nxd5', null, 'w', 0)).toBeNull();
  });
  it('a trade when ahead is praised', () => {
    const t = tradeJudgement('4k3/8/5n2/3n4/8/2N5/8/R3K3 w - - 0 1', 'Nxd5', 'Nxd5', 'w', 0);
    expect(t?.reason).toBe('ahead');
    expect(t?.text).toMatch(/^A knight for a knight — and trading is exactly right when you are ahead/);
  });
  it('a bishop hemmed in by its own centre pawns is a good one to give', () => {
    // Recaptured by the e-pawn: with …Nxd5 instead, cxd5 wins the knight and
    // the settled read is honestly "ahead" (walk 2026-10-02, settledLead).
    const t = tradeJudgement('4k3/4n3/4p3/3b4/2P1B3/3P1P2/8/4K3 w - - 0 1', 'Bxd5', 'exd5', 'w', 0);
    expect(t?.reason).toBe('bad-bishop');
    expect(t?.text).toMatch(/3 of your own centre pawns stand on its light squares/);
  });

  describe('good piece, bad piece — from the engine table (David 2026-09-30)', () => {
    const FEN = '4k3/8/5n2/3n4/8/2N5/8/R3K3 w - - 0 1';
    const v = (square: string, piece: string, value: number): PieceValue => ({ square, piece, color: piece === piece.toUpperCase() ? 'w' : 'b', value });
    it('trading off their busiest piece for your idlest is named a good trade', () => {
      const table = [v('c3', 'N', 2), v('a1', 'R', 5), v('d5', 'n', -5), v('f6', 'n', -2)];
      const t = tradeJudgement(FEN, 'Nxd5', 'Nxd5', 'w', 0, table);
      expect(t?.reason).toBe('their-best');
      expect(t?.text).toBe('A good trade — their knight on d5 was the piece doing the most work for them, and it cost you your least useful piece.');
    });
    it('giving your best piece for their idlest is named a bad deal', () => {
      const table = [v('c3', 'N', 5), v('a1', 'R', 5), v('d5', 'n', -2), v('f6', 'n', -5)];
      const t = tradeJudgement(FEN, 'Nxd5', 'Nxd5', 'w', 0, table);
      expect(t?.reason).toBe('gave-best');
      expect(t?.text).toMatch(/^That trade gave up your best piece, the knight on c3, for their least useful one/);
    });
    it('without a table the old reasons still hold', () => {
      expect(tradeJudgement(FEN, 'Nxd5', 'Nxd5', 'w', 0)?.reason).toBe('ahead');
    });
  });
});
