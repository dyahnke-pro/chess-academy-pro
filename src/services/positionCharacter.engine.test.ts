import { describe, expect, it } from 'vitest';
import { boardKind } from './positionCharacter';

// THE KIND OF POSITION IS NEVER SAID AGAINST THE ENGINE (Danya narration test
// 2026-11-19). Real boards, their saved engine lines (White's view).
const L = (cp: number, moves: string): { evaluation: number; moves: string[] } => ({ evaluation: cp, moves: moves.split(' ') });

describe('boardKind — against the engine', () => {
  it('mastering intuition #1: "no hurry" is not said when the best move is the c5 break, +1.24 against +0.50', () => {
    const fen = 'b2r2k1/p4pp1/2prp3/P5P1/2PP4/4RB2/5PK1/3R4 w - - 0 37';
    const lines = [L(124, 'c4c5 d6d4 d1d4 d8d4 e3b3'), L(50, 'e3d3 c6c5 f3a8 d8a8 d4d5'), L(32, 'e3b3 c6c5 f3a8 d8a8 d1h1')];
    expect(boardKind(fen, 'w', 124, lines)?.kind).not.toBe('no-counterplay');
    expect(boardKind(fen, 'w', 124)?.kind).not.toBe('no-counterplay');
  });

  it('negative control: a quiet best move, nothing far above the rest, still says no counterplay', () => {
    const fen = 'k7/p7/P7/8/8/8/8/2R1R1K1 w - - 0 1';
    const lines = [L(900, 'g1f2 a8b8'), L(890, 'g1g2 a8b8')];
    expect(boardKind(fen, 'w', 900, lines)?.kind).toBe('no-counterplay');
  });

  it('mastering opposite-coloured bishops #1: +2.42 is the engine seeing the win, not drawing chances', () => {
    expect(boardKind('7k/7p/4Pb2/8/1p2p1P1/1B6/P1P4P/7K w - - 0 40', 'w', 242)).toBeNull();
  });

  it('a guide to underpromotion #0: a pawn against a rook is a race, not one-wing drawing chances', () => {
    expect(boardKind('8/8/1KP5/3r4/8/8/8/k7 w - - 0 1', 'w', 150)).toBeNull();
  });

  it('how to beat Magnus Carlsen #1: locked never claims nobody is in danger', () => {
    const k = boardKind('r2qr1k1/1b1n1pbp/p2p1np1/1p1Pp1B1/P1p1P3/2P2NNP/1PBQ1PP1/R3R1K1 b - - 0 18', 'b', -45);
    expect(k?.text ?? '').not.toMatch(/nobody is in danger/);
  });

  it('the drawing-chances line never says "you\'re better" a second time', () => {
    expect(boardKind('6k1/5ppp/8/2b5/8/3B4/5PPP/6K1 w - - 0 1', 'w', 120)?.text).not.toMatch(/You're better/);
  });
});
