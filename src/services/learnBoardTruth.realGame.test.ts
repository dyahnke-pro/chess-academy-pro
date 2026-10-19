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
import { kingAttack } from './kingAttack';
import { boardStructure, theirMoveStructure } from './structureReads';

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
    expect(deriveNextPlans(at(48), 'w', { namesStudentMoves: true }).join(' ')).not.toMatch(/heavy pieces/);
  });

  it('33.Ne8 Kxe8: the taken knight has no squares', () => {
    expect(knightSquares(at(64), 'Ne8', 'w', 150, at(65))?.text).toMatch(/On e8 your knight touches only four squares/);
    expect(knightSquares(at(64), 'Ne8', 'w', 150, at(66))).toBeNull();
  });

  // LEARN NAMES NO MOVE UNASKED — the held form of each producer, on the board it was heard.
  it('16.Ne3: heads for their king without naming Nf5', () => {
    expect(kingAttack(at(30), 'Ne3', true)?.text).toMatch(/Nf5 next/);
    const held = kingAttack(at(30), 'Ne3', false);
    expect(held?.text).toBe('Ne3 heads for their king — one more knight move brings it to bear.');
    expect(held?.next).toBeUndefined();
    expect(held?.squares).not.toContain('f5');
  });

  it('20…Nd4: the masked hole and the unmoved pawn hold c3', () => {
    const masked = boardStructure(at(40), 'w').find((r) => r.act === 'masked-weakness');
    expect(masked?.text).toMatch(/chase it with c3/);
    expect(masked?.heldForm?.text).not.toMatch(/c3/);
    const unmoved = theirMoveStructure(at(39), GAME[39], 'w').find((r) => r.act === 'unmoved-units');
    expect(unmoved?.text).toMatch(/on c3 it would cover/);
    expect(unmoved?.heldForm?.text).toBe('Their knight reaches d4 because no pawn of yours covers that square yet.');
  });

  it('17…: the worst-piece plan holds its route', () => {
    const named = deriveNextPlans(at(34), 'w', { namesStudentMoves: true }).join(' ');
    const held = deriveNextPlans(at(34), 'w', { namesStudentMoves: false }).join(' ');
    expect(named).toMatch(/walk it to c3, by way of d2/);
    expect(held).not.toMatch(/by way of|d2/);
  });
});
