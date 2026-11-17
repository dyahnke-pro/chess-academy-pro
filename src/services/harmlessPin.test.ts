import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { harmlessPin, harmlessPinLine } from './harmlessPin';
import { readBoard } from './boardComputers';

// Danya speedrun 1Rejj6niwvo, 7.Bb5 against his Black: "Rate a pin in two
// checks: is the pinned piece pawn-guarded, and will the pin end soon
// (castling)? Then harmless." Engine line after (depth 14): …Bc5 Nh3 …O-O.
const FEN = 'r1bqkb1r/pp3ppp/2n1p3/3p4/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 7';
const LINE = ['f8c5', 'g1h3', 'e8g8', 'b5c6', 'b7c6', 'e1g1'];
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('harmlessPin: rate a pin in two checks', () => {
  it('the pin on c6 is harmless: b7 guards the knight and castling ends it', () => {
    const h = harmlessPin(FEN, 'Bb5', LINE);
    expect(h).toMatchObject({ pinned: { square: 'c6', piece: 'n' }, target: { square: 'e8', piece: 'k' }, guard: 'b7', end: { how: 'castles' } });
    const line = harmlessPinLine(h!, false, after(FEN, 'Bb5'));
    expect(line).toMatch(/Their bishop on b5 pins your knight on c6 to the king/);
    expect(line).toMatch(/pawn on b7/);
    expect(line).toMatch(/castling ends it/);
  });
  it('says nothing when the line cashes the pin in, or does not end it within two of their moves', () => {
    expect(harmlessPin(FEN, 'Bb5', ['e4d6', 'b5c6', 'b7c6'])).toBeNull();
    expect(harmlessPin(FEN, 'Bb5', ['e4d6', 'c2c3', 'd6f5', 'd2d3', 'c8d7'])).toBeNull();
  });
  it('says nothing about a move that pins nothing', () => {
    expect(harmlessPin(FEN, 'Bd3', ['f8c5', 'g1h3', 'e8g8'])).toBeNull();
  });
  it('comes out of the one registry as the student-seat fact', () => {
    const f = readBoard('harmlessPin', { fenBefore: FEN, san: 'Bb5', student: 'b', line: LINE });
    expect(f?.computer).toBe('harmlessPin');
    expect(f?.seat).toBe('opponent');
    expect(f?.squares).toEqual(expect.arrayContaining(['b5', 'c6', 'e8', 'b7']));
  });
});
