import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tradeJudgement } from './tradeJudgement';

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
    const t = tradeJudgement('4k3/4n3/8/3b4/2P1B3/3P1P2/8/4K3 w - - 0 1', 'Bxd5', 'Nxd5', 'w', 0);
    expect(t?.reason).toBe('bad-bishop');
    expect(t?.text).toMatch(/3 of your own centre pawns stand on its light squares/);
  });
});
