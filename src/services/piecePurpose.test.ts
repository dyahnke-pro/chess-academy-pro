import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { parsePiecePurpose, assemblePiecePurposeAnswer } from './groundedAnswer';

// David 2026-08-28 (verifying board questions live): "What is my bishop on c4
// aiming at?" deflected to a best move about a KNIGHT ("the best move is Nc3").
// A piece-purpose question must be answered from the BOARD — what the named
// piece actually hits. Every fact here is checked against a real position.
const line = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

describe('parsePiecePurpose — only fires on a real piece-purpose question', () => {
  it('parses the piece + square', () => {
    expect(parsePiecePurpose('What is my bishop on c4 aiming at?')).toEqual({ piece: 'b', square: 'c4' });
    expect(parsePiecePurpose('what does my knight on f3 do')).toEqual({ piece: 'n', square: 'f3' });
    expect(parsePiecePurpose('what is my rook attacking')).toEqual({ piece: 'r', square: null });
  });
  it('does NOT fire on best-move / quality / non-piece questions', () => {
    expect(parsePiecePurpose('what is the best move here?')).toBeNull();
    expect(parsePiecePurpose('is my bishop bad?')).toBeNull();     // quality, not purpose
    expect(parsePiecePurpose("who's winning?")).toBeNull();
    expect(parsePiecePurpose('what is the plan?')).toBeNull();
  });
});

describe('assemblePiecePurposeAnswer — board-true piece reach', () => {
  // 1.e4 Nc6 2.d4 a6 3.Nf3 Nb8 4.Bc4 c6 — White to move, bishop on c4.
  const fen = line(['e4', 'Nc6', 'd4', 'a6', 'Nf3', 'Nb8', 'Bc4', 'c6']);

  it('answers what the bishop on c4 actually hits (f7 + the g8-knight x-ray) — NOT a best move about another piece', () => {
    const out = assemblePiecePurposeAnswer(fen, 'What is my bishop on c4 aiming at?', 'white');
    expect(out).not.toBeNull();
    // It must talk about the BISHOP the user asked about, not a knight.
    expect(out!.facts.toLowerCase()).toContain('bishop on c4');
    expect(out!.facts).not.toMatch(/best move/i);
    // f7 is a real target on the board; the g8-knight is a real x-ray behind it.
    expect(out!.facts).toContain('f7');
    expect(out!.facts).toContain('g8');
    // Every square it names must really be attacked by the c4-bishop.
    const board = new Chess(fen);
    for (const sq of (out!.facts.match(/\b[a-h][1-8]\b/g) ?? [])) {
      const onLine = board.attackers(sq as never, 'w').includes('c4') || sq === 'c4' || sq === 'g8';
      expect(onLine, `${sq} named but not on the c4-bishop's lines`).toBe(true);
    }
  });

  it('reports honestly when the piece is not where the user thinks', () => {
    const out = assemblePiecePurposeAnswer(fen, 'what is my rook on a5 doing?', 'white');
    expect(out).not.toBeNull();
    expect(out!.facts).toMatch(/don'?t have a rook on a5/i);
  });

  it('returns null for a non-piece-purpose question (does not hijack)', () => {
    expect(assemblePiecePurposeAnswer(fen, 'what is the best move?', 'white')).toBeNull();
  });
});
