import { describe, expect, it } from 'vitest';
import { winningLine } from './learnBoardTeaching';

describe('winningLine — the line that makes the found move work (pass-2 walk 2026-09-30)', () => {
  // King's Indian, after 9.d5: 9…Nxd5 10.cxd5 Bxc3+ 11.Bxc3 Qxc3+ wins a pawn.
  const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 9';
  it('says the line to the last capture, with what it wins', () => {
    const w = winningLine(fen, 'Nxd5', ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'], 'b');
    expect(w?.what).toBe('a pawn');
    expect(w?.sans).toEqual(['…Nxd5', 'cxd5', '…Bxc3+', 'Bxc3', '…Qxc3+']);
    expect(w?.arrows).toHaveLength(5);
  });
  it('a line that ends level or behind says nothing', () => {
    expect(winningLine(fen, 'Nxd5', ['f6d5', 'c4d5', 'g7c3', 'b2c3'], 'b')).toBeNull();
  });
  it('a different first move says nothing', () => {
    expect(winningLine(fen, 'Nb4', ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'], 'b')).toBeNull();
  });
});

describe('studentMoveTeaching — a winning move says its line (David 2026-09-30)', () => {
  it('the engine move that wins a pawn plays the line out, drawn', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 9';
    const hints = studentMoveTeaching({
      fenBefore: fen, san: 'Nxd5', history: ['Nxd5'], cpLoss: 0, bothCp: true, bestSan: 'Nxd5',
      bestLine: { rank: 1, evaluation: -270, mate: null, moves: ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'] },
      reply: null, cpAfter: null,
    });
    const line = hints.find((h) => h.lane === 'movePoint' && /wins a pawn/.test(h.text));
    expect(line?.text).toBe('That wins a pawn: …Nxd5 cxd5 …Bxc3+ Bxc3 …Qxc3+.');
    expect(line?.arrows).toHaveLength(5);
  });
});
