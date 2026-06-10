import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer, assembleTacticsAnswer, assembleProgressAnswer } from './groundedAnswer';
import type { TacticsLiveContext } from '../coach/types';

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

function tactics(over: Partial<TacticsLiveContext> = {}): TacticsLiveContext {
  return { immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 4, ...over } as TacticsLiveContext;
}

describe('assembleTacticsAnswer — Phase 2 (voice the engine-computed tactics)', () => {
  it('voices a forced mate-in-one first', () => {
    const a = assembleTacticsAnswer(tactics({ boardFacts: { sideToMove: 'white', mateInOne: 'Qh7#' } as TacticsLiveContext['boardFacts'] }), 'white');
    expect(a!.facts).toContain('checkmate in one: Qh7#');
  });
  it("voices the engine's fork description verbatim (no LLM)", () => {
    const a = assembleTacticsAnswer(tactics({ immediate: [{ type: 'fork', description: 'Knight on d5 forks queen on c7 and rook on f6', squares: ['d5', 'c7', 'f6'] }] }), 'white');
    expect(a!.facts).toContain('Knight on d5 forks queen on c7');
  });
  it("warns about the STUDENT's hanging piece, not the opponent's", () => {
    const a = assembleTacticsAnswer(tactics({ hanging: [{ square: 'b4', piece: 'b', color: 'w' }, { square: 'e5', piece: 'p', color: 'b' }] }), 'white');
    expect(a!.facts).toContain('Your bishop on b4 is hanging');
    expect(a!.facts).not.toContain('e5');
  });
  it('falls to the top threat when nothing immediate', () => {
    const a = assembleTacticsAnswer(tactics({ threats: [{ type: 'fork', description: 'Black threatens Nxe4', depthAhead: 2, line: [] }] }), 'white');
    expect(a!.facts).toContain('Watch out');
  });
  it('returns null when there is no concrete tactic (caller falls back)', () => {
    expect(assembleTacticsAnswer(tactics(), 'white')).toBeNull();
  });
});

import type { BadHabit } from '../types';
function habit(over: Partial<BadHabit> = {}): BadHabit {
  return { id: 'h', description: 'you hang pieces in the opening', occurrences: 3, lastSeen: '2026-06-10', isResolved: false, ...over };
}
describe('assembleProgressAnswer — Phase 6 (voice the student\'s real history)', () => {
  it('voices the top unresolved habits, most frequent first', () => {
    const a = assembleProgressAnswer([habit({ description: 'you trade your good bishop', occurrences: 2 }), habit({ description: 'you hang pieces in the opening', occurrences: 5 })]);
    expect(a!.facts).toMatch(/hang pieces in the opening \(5 times\).*good bishop \(2 times\)/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('ignores resolved habits and returns null when none remain', () => {
    expect(assembleProgressAnswer([habit({ isResolved: true })])).toBeNull();
    expect(assembleProgressAnswer([])).toBeNull();
  });
});
