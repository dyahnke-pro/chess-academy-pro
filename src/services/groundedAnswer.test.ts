import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer } from './groundedAnswer';

// Phase 1: the facts for a move/eval question are assembled IN CODE — the
// best move (chess.js SAN from the engine UCI), the grounded "why", and the
// real eval. The LLM only voices this; it never reasons. These tests prove
// the assembler never fabricates and always grounds on the real board.
describe('assembleMoveEvalAnswer', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('grounds the best move as a real SAN + arrow from the engine UCI', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'g1f3', evalCp: 30 });
    expect(a).not.toBeNull();
    expect(a!.bestMoveSan).toBe('Nf3');
    expect(a!.bestMoveFromTo).toEqual({ from: 'g1', to: 'f3' });
    expect(a!.facts).toContain('The best move is Nf3.');
    expect(a!.sources).toContain('engine:stockfish');
  });

  it('grounds a legal sliding move to its real SAN (1.e4 e5 → Qh5)', () => {
    // After 1.e4 e5 the e2 square is empty, so Qd1-h5 is legal.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const a = assembleMoveEvalAnswer({ fen, bestMoveUci: 'd1h5', evalCp: 60 });
    expect(a).not.toBeNull();
    expect(a!.bestMoveSan).toBe('Qh5');
  });

  it('phrases the real eval, never invents a number', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', evalCp: 280 });
    expect(a!.facts.toLowerCase()).toMatch(/winning|clearly better|2\.8/);
    // balanced case
    const b = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', evalCp: 10 });
    expect(b!.facts.toLowerCase()).toContain('balanced');
  });

  it('reports a forced mate when given one', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', mateIn: 3 });
    expect(a!.facts.toLowerCase()).toContain('forced mate in 3');
  });

  it('returns null (never fabricates) when there is no engine move', () => {
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: null })).toBeNull();
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: '' })).toBeNull();
  });

  it('returns null on an illegal engine move rather than inventing a SAN', () => {
    // e2e5 is not a legal first move (pawn can't jump 3).
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e5' })).toBeNull();
  });

  it('returns null on an unparseable FEN (never blanks/fabricates)', () => {
    expect(assembleMoveEvalAnswer({ fen: 'garbage', bestMoveUci: 'g1f3' })).toBeNull();
  });
});
