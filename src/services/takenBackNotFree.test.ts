import { describe, it, expect } from 'vitest';
import { studentMovePoint } from './playCommentary';

// Clean-pass walk 2026-10-04, G3 (lichess mZ1GOTOw), Learn: "You found it: that
// wins the pawn on e5 — nothing takes it back safely" (34…fxe5) and "…the knight
// on d6 — nothing takes it back safely" (35…Rxd6). On the board Bxe5 takes back
// safely (the king cannot, with Re1 behind it) and Bxd6 wins the exchange back.
describe('"nothing takes it back" is decided on the board', () => {
  it('34…fxe5 — Bxe5 takes it back', () => {
    const said = studentMovePoint('3r4/3r2p1/p2Nkp1p/1pp1P3/8/P4K2/1B5P/4R3 b - - 1 34', 'fxe5', 'Kf3', ['f6e5', 'd6e4', 'd7d1']) ?? '';
    expect(said).not.toMatch(/nothing takes it back/);
    expect(said).toMatch(/even after they take back you come out ahead/);
  });
  it('35…Rxd6 — Bxd6 takes it back', () => {
    const said = studentMovePoint('3r4/3r2p1/p2Nk2p/1pp1B3/8/P4K2/7P/4R3 b - - 0 35', 'Rxd6', 'Bxe5', ['d7d6', 'f3g4', 'e6f7', 'e1f1', 'f7g8', 'e5d6', 'd8d6']) ?? '';
    expect(said).not.toMatch(/nothing takes it back/);
  });
});
