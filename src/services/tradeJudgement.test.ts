import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tradeJudgement } from './tradeJudgement';
import type { PieceValue } from './pieceValueRead';

const at = (moves: string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };

describe('tradeJudgement (P3, T3)', () => {
  it('the Ruy exchange: the one trade judge names what it does — taking back doubles their pawns', () => {
    const t = tradeJudgement(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6']), 'Bxc6', 'dxc6', 'w', 0);
    expect(t?.reason).toBe('good');
    expect(t?.text).toMatch(/doubles their pawns/);
  });
  it('silent without a recapture on the same square', () => {
    expect(tradeJudgement('4k3/8/5n2/3n4/8/2N5/8/R3K3 w - - 0 1', 'Nxd5', null, 'w', 0)).toBeNull();
  });
  it('a trade when ahead is praised', () => {
    const t = tradeJudgement('4k3/8/5n2/3n4/8/2N5/8/R3K3 w - - 0 1', 'Nxd5', 'Nxd5', 'w', 0);
    expect(t?.reason).toBe('ahead');
    expect(t?.text).toMatch(/trades pieces while you're ahead/);
  });
  it('a bishop standing IN FRONT of its pawns is not a bad bishop — the one piece-quality read says so', () => {
    // The old judge called Be4 bad for its colour-mates on c4/d3/f3; it stands
    // outside the chain, and the shared computer (findPieceQuality: hemmed in
    // BEHIND its own pawns) does not call it bad. One definition (census 7/8).
    expect(tradeJudgement('4k3/4n3/4p3/3b4/2P1B3/3P1P2/8/4K3 w - - 0 1', 'Bxd5', 'exd5', 'w', 0)).toBeNull();
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
