// The Learn hand walk of 2026-10-19 (audit-reports/hand-walk-black-2026-10-19.md
// on origin/learn-audit-black): David's record loaded, student White. Each test
// pins a defect to the exact board the student heard it on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { fightingLine } from './planJudgement';
import { readBoardUrgency } from './boardUrgency';
import { knightSquares } from './exchangeIdeas';
import { stripDisprovenSentences } from './boardClaimValidator';
import { deriveNextPlans } from './nextPlans';
import { finishesTrade } from './criticalMoment';

const GAME = 'e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3 axb3 Bxg3 fxg3 Nb8 Qh5 a5 Ne3 b6 Qh4 Nc6 Ra3 Qxh4 gxh4 Rfd8 h5 Nd4 Rf2 Ra7 Rxa5 Rxa5 Bd2 Ra7 h6 gxh6 Nf1 Kg7 Ng3 Rg8 Nh5+ Kf8 Nf6 Rg6 h4 Kg7 Ne8+ Kf8 Nxd6 Nxc2 h5 Rg8 Ne8 Kxe8'.split(' ');
/** The board after `ply` half-moves of the game. */
const at = (ply: number): string => { const c = new Chess(); GAME.slice(0, ply).forEach((m) => c.move(m)); return c.fen(); };

describe('Learn board truth — the real game', () => {
  it('2.Ne2 Nc6: d4 cxd4 Nxd4 creates no imbalance (read at the quiet end)', () => {
    expect(fightingLine(at(4), 'w', [
      { moves: ['d2d4', 'c5d4', 'e2d4', 'g8f6'], evaluation: 39 },
      { moves: ['b1c3', 'g7g6', 'd2d4', 'c5d4'], evaluation: 30 },
    ])).toBeNull();
  });

  it('12…Nxb3: the urgency read sees the free knight and the attacked rook', () => {
    const u = readBoardUrgency(at(24), 'white');
    expect(u?.win?.square).toBe('b3');
    expect(u?.save[0]?.square).toBe('a1');
  });

  it('14.fxg3 and 19.gxh4 finish their trade — not an only-move find', () => {
    expect(finishesTrade(GAME[25], GAME[26])).toBe(true); // …Bxg3 fxg3
    expect(finishesTrade(GAME[35], GAME[36])).toBe(true); // …Qxh4 gxh4
    expect(finishesTrade(GAME[23], GAME[26])).toBe(false);
  });

  it('22.Rxa5: "the pawn on b6 takes back" is true on the board after Rxa5', () => {
    const t = 'That took the pawn on a5, but the pawn on b6 takes back — you lose a rook for a pawn.';
    expect(stripDisprovenSentences(t, at(43)).dropped).toHaveLength(0);
  });

  it('24…gxh6: one rook on the board is never "your heavy pieces"', () => {
    expect(deriveNextPlans(at(48), 'w').join(' ')).not.toMatch(/heavy pieces/);
  });

  it('33.Ne8 Kxe8: the taken knight has no squares', () => {
    expect(knightSquares(at(64), 'Ne8', 'w', 150, at(65))?.text).toMatch(/On e8 your knight touches only four squares/);
    expect(knightSquares(at(64), 'Ne8', 'w', 150, at(66))).toBeNull();
  });
});
