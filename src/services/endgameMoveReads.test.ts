import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { rooksOnSeventh, kingToCentre, pawnForDevelopment } from './endgameMoveReads';
import { studentMoveStructure } from './structureReads';

// Naroditsky's Alekhine (video 1rcEbI44WqE), the boards before his moves.
const BEFORE_RFF7 = '4k3/1pp4R/4p1r1/2P3b1/3P1R1p/6pP/P5P1/6K1 w - - 6 50';
const BEFORE_KE2 = '4k3/1pR4R/4pr2/2P5/3b3p/6pP/P5P1/5K2 w - - 1 53';

const fenAfter = (moves: string): string => {
  const c = new Chess();
  for (const m of moves.split(' ')) c.move(m);
  return c.fen();
};
// White is four developing moves up; Nd5 leaves e4 to the f6 knight.
const BEFORE_ND5 = fenAfter('e4 e5 Nf3 Nf6 Nc3 h6 Bc4 a6 O-O d6');

describe('the later game, named the way he names it (Alekhine walk 2026-10-19)', () => {
  it('names both rooks on the seventh, the pawns they hit and the boxed king', () => {
    const r = rooksOnSeventh(BEFORE_RFF7, 'Rff7', 'w', 0, null);
    expect(r?.act).toBe('rooks-on-seventh');
    expect(r?.text).toContain('the pawns on b7 and c7');
    expect(r?.text).toContain('box their king');
    expect(r?.squares).toEqual(expect.arrayContaining(['f7', 'h7', 'b7', 'c7', 'e8']));
  });

  it('NEGATIVE: one rook on the seventh, or a costly move, is not the doubled-rooks plan', () => {
    expect(rooksOnSeventh(BEFORE_RFF7, 'Rf6', 'w', 0, null)).toBeNull();
    expect(rooksOnSeventh(BEFORE_RFF7, 'Rff7', 'w', 200, null)).toBeNull();
  });

  it('names the king walking to the centre with the queens off — even out of a check, when Ke1 was there too', () => {
    const r = kingToCentre(BEFORE_KE2, 'Ke2', 'w', 0);
    expect(r?.act).toBe('king-to-centre');
    expect(r?.text).toContain('e2');
    expect(kingToCentre(BEFORE_KE2, 'Ke1', 'w', 0)).toBeNull();
  });

  it('NEGATIVE: a king move with the queens on is not an endgame king', () => {
    const queensOn = '4k3/1pR4R/4pr2/2P5/3b3p/6pP/P5P1/3Q1K2 w - - 1 53'.replace('4k3', '3qk3');
    expect(kingToCentre(queensOn, 'Ke2', 'w', 0)).toBeNull();
  });

  it('names a pawn left on purpose for a development lead, only when the engine calls the move sound', () => {
    const r = pawnForDevelopment(BEFORE_ND5, 'Nd5', 'w', 10, null);
    expect(r?.act).toBe('pawn-for-development');
    expect(r?.text).toContain('pawn on e4');
    expect(r?.text).toContain('three developing moves ahead');
    expect(pawnForDevelopment(BEFORE_ND5, 'Nd5', 'w', 120, null)).toBeNull();
  });

  it('NEGATIVE: a move that leaves nothing new to take says nothing', () => {
    expect(pawnForDevelopment(BEFORE_ND5, 'Re1', 'w', 0, null)).toBeNull();
  });

  it('the lead is counted after their reply, and said in words (David\'s record 2026-10-19)', () => {
    // A developing reply shrinks the lead before the sentence is heard.
    const r = pawnForDevelopment(BEFORE_ND5, 'Nd5', 'w', 10, 'Be7');
    // Three ahead after Nd5; …Be7 develops a piece, so it is two by then.
    expect(r?.text).toContain('two developing moves ahead');
  });

  it('their king stepping along the back rank leaves the doubled rooks true', () => {
    const r = rooksOnSeventh('6k1/p1R3pp/8/8/8/8/3R2PP/6K1 w - - 0 35', 'Rdd7', 'w', 0, 'Kf8');
    expect(r?.act).toBe('rooks-on-seventh');
    expect(r?.text).toContain('box their king');
  });

  it('reaches the student-move door, so Learn and Review hear it', () => {
    const acts = studentMoveStructure({ fenBefore: BEFORE_RFF7, san: 'Rff7', student: 'w', cpLoss: 0, namesBetterMove: false } as Parameters<typeof studentMoveStructure>[0]).map((x) => x.act);
    expect(acts).toContain('rooks-on-seventh');
  });
});
