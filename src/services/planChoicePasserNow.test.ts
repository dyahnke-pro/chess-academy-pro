import { describe, it, expect } from 'vitest';
import { planChoice } from './planChooser';

// Clean-pass walk, game mZ1GOTOw after 33.Ke2: "Two plans hold here — pushing
// the passed pawn on the f-file, or the c-file." Black's f7 pawn is not passed —
// White's pawn on e5 stands in front of it on the next file. The engine line
// makes one later; the sentence says there is one now.
const FEN = '3r4/3r1pp1/p2Nk2p/1pp1P3/8/P7/1B2K2P/4R3 b - - 1 33';

describe('a plan choice names only a passed pawn the board has', () => {
  it('does not call f7 "the passed pawn" while e5 stands in front of it', () => {
    // Two of the engine's own lines here (depth 14, MultiPV), White-POV.
    const out = planChoice(FEN, [
      { moves: ['d7c7', 'e1g1', 'g7g6', 'g1f1', 'f7f5', 'h2h4', 'd8g8', 'e2e3', 'c7d7', 'b2a1'], evaluation: -132 },
      { moves: ['a6a5', 'e1c1', 'c5c4', 'b2a1', 'f7f6', 'a1c3', 'b5b4', 'a3b4', 'a5b4', 'c3b4'], evaluation: -128 },
    ], 'black', null);
    expect(out?.text ?? '').not.toMatch(/passed pawn on the f-file/);
  });

  it('the c5 pawn IS passed, so that plan may still be named', async () => {
    const { aimWalkableNow } = await import('./planArc');
    expect(aimWalkableNow({ id: 'passer:c', kind: 'passer', squares: ['c5'], goal: null, phrase: '' } as never, FEN, 'b')).toBe(true);
    expect(aimWalkableNow({ id: 'passer:f', kind: 'passer', squares: ['f7'], goal: null, phrase: '' } as never, FEN, 'b')).toBe(false);
  });
});
