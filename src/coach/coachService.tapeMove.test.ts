// A named move on the tape, not on the board, is the PLAYED move (question
// walk 2026-09-27, Blumenfeld as Black). Every question below was answered as
// a hypothetical — "Nf1 isn't a legal move in this position".
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { tapeMoveRef } from './coachService';

const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1'.split(' ');
const at = (n: number): { fen: string; history: string[] } => {
  const c = new Chess(); const h = GAME.slice(0, n); for (const s of h) c.move(s); return { fen: c.fen(), history: h };
};

describe('tapeMoveRef', () => {
  it('"Why Nf1?" after Nf1 is the played knight move', () => {
    const { fen, history } = at(31);
    expect(tapeMoveRef('Why Nf1?', fen, history)).toEqual({ kind: 'san', san: 'Nf1' });
    expect(tapeMoveRef('Why did they move the knight to f1?', fen, history)).toEqual({ kind: 'san', san: 'Nf1' });
  });
  it('"Why did they play Be2?" is the played bishop retreat', () => {
    const { fen, history } = at(29);
    expect(tapeMoveRef('Why did they play Be2?', fen, history)).toEqual({ kind: 'san', san: 'Be2' });
  });
  it('"Is b5 a sound sacrifice?" after b3 is the played gambit', () => {
    const { fen, history } = at(9);
    expect(tapeMoveRef('Is b5 a sound sacrifice?', fen, history)).toEqual({ kind: 'san', san: 'b5' });
  });
  it('a move legal NOW stays a candidate (negative control)', () => {
    const { fen, history } = at(29);
    expect(tapeMoveRef('Is Qd7 good?', fen, history)).toBeNull();
  });
  it('a hypothetical never reaches back to the tape (negative control)', () => {
    const { fen, history } = at(35 > GAME.length ? GAME.length : 31);
    expect(tapeMoveRef('What happens if I take on b5?', fen, history)).toBeNull();
    expect(tapeMoveRef('Can I play b5?', fen, history)).toBeNull();
  });
  it('a move never played is not invented', () => {
    const { fen, history } = at(31);
    expect(tapeMoveRef('Why Nh4?', fen, history)).toBeNull();
  });
});

describe('the b-file is a pawn, not a bishop', async () => {
  const { extractCandidateSan } = await import('./questionIntents');
  it('"b5" is the pawn move; "Bb5" and "bc4" are bishop moves', () => {
    expect(extractCandidateSan('Is b5 a sound sacrifice?')).toBe('b5');
    expect(extractCandidateSan('what about b4')).toBe('b4');
    expect(extractCandidateSan('Is Bb5 good?')).toBe('Bb5');
    expect(extractCandidateSan('is bc4 ok')).toBe('Bc4');
  });
});

describe('"the pawn or the queen" when only one can take', async () => {
  const { resolveCompareMoves } = await import('./coachService');
  it('after 13.Nxe5 only the pawn reaches e5', async () => {
    const { fen, history } = at(25);
    await expect(resolveCompareMoves('Should I recapture with the pawn or the queen?', fen, history))
      .resolves.toEqual({ only: 'dxe5', cannot: 'queen', square: 'e5' });
  });
  it('a question about what a piece DOES now is not about the move that put it there (2026-10-08)', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
    const history = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6'];
    expect(tapeMoveRef('What is my bishop on c4 aiming at?', fen, history)).toBeNull();
    expect(tapeMoveRef('who controls the e5 square?', fen, history)).toBeNull();
    // Still the move: why it was played.
    expect(tapeMoveRef('Why play Nc3?', fen, history)).toEqual({ kind: 'san', san: 'Nc3' });
  });
});
