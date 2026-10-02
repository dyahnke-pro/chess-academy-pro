import { describe, it, expect } from 'vitest';
import { generateMistakeNarration, type NarrationParams } from './mistakeNarration';

// Real cards from the hand walk 2026-10-01 (chess.com account "erik").
const base = (o: Partial<NarrationParams>): NarrationParams => ({
  classification: 'mistake', gamePhase: 'middlegame', cpLoss: 197, moves: '', fen: '',
  playerMoveSan: '', bestMoveSan: '', allowedReplySan: null, ...o,
});

describe('the mistake card leads with what the move allowed', () => {
  const r2b3 = base({
    fen: '1r4k1/p2b1p1p/3ppbp1/q7/4P3/P1PQ1NPP/1r3PB1/R1R3K1 b - - 2 23',
    playerMoveSan: 'R2b3', bestMoveSan: 'Qc5', moves: 'a5c5', allowedReplySan: 'Qxd6',
  });

  it('R2b3: names the punishment, then the cost — not a description of the board', () => {
    const n = generateMistakeNarration(r2b3);
    expect(n.intro).toMatch(/^R2b3 lets them play Qxd6, winning your pawn on d6\. That cost around 2\.0 points\./);
  });

  it('the solve closes the loop: Qc5 keeps the pawn the intro said was lost', () => {
    const n = generateMistakeNarration(r2b3);
    expect(n.moveNarrations[0]).toBe('Qc5 keeps your pawn on d6 protected.');
  });

  it('Kh8: the knight that escapes with check is named as the fork it is', () => {
    const n = generateMistakeNarration(base({
      classification: 'blunder', cpLoss: 546,
      fen: 'r5k1/1pp1p1rP/p2p4/4b1Q1/4pN2/2P1q2P/PP4P1/1R1R3K b - - 0 26',
      playerMoveSan: 'Kh8', bestMoveSan: 'Kxh7', moves: 'g8h7', allowedReplySan: 'Ng6+',
    }));
    expect(n.intro).toMatch(/^Kh8 lets them play Ng6\+, forking your king on h8 and your /);
    expect(n.intro).not.toMatch(/pins knight on f4/);
  });

  it('with no reply known, no unrelated pattern and no owner-less piece leads', () => {
    const n = generateMistakeNarration(base({
      classification: 'blunder', cpLoss: 326,
      fen: '2r2rkb/1b1nqp1p/1n2p1pP/3p2P1/1p2P3/3PB1N1/1P1QBP1N/R3K2R b KQ - 3 21',
      playerMoveSan: 'Rc3', bestMoveSan: 'd4', moves: 'd5d4',
    }));
    expect(n.intro).not.toMatch(/Bishop on h8 pins/);
    expect(n.intro).not.toMatch(/(^|\. )(Queen|Rook|Bishop|Knight|Pawn) on [a-h][1-8]/);
  });

  it('Rc3 with the game reply: bxc3 wins the rook, said first', () => {
    const n = generateMistakeNarration(base({
      classification: 'blunder', cpLoss: 326,
      fen: '2r2rkb/1b1nqp1p/1n2p1pP/3p2P1/1p2P3/3PB1N1/1P1QBP1N/R3K2R b KQ - 3 21',
      playerMoveSan: 'Rc3', bestMoveSan: 'd4', moves: 'd5d4', allowedReplySan: 'bxc3',
    }));
    expect(n.intro).toMatch(/^Rc3 lets them play bxc3, winning your rook on c3\./);
  });
});
