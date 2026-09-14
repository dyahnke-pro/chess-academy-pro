import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainPuzzleConcept, explainDrillConcept } from './puzzleConceptExplanation';

describe('explainPuzzleConcept (teach the concept behind the solution)', () => {
  // Black (opponent) to move plays a quiet pawn push; White (student) answers
  // Nc7+ — a knight fork of the king on e8 and the rook on a8.
  const FORK_FEN = 'r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1';
  const FORK_SOLUTION = ['b7b5', 'e6c7'];

  it('names the concept, computes the line, and carries the general idea', () => {
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['fork'] });
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.conceptId).toBe('tac-fork');
    // The general idea (from chess-concepts.json) teaches WHY a fork works.
    expect(r!.idea).toMatch(/fork|two/i);
    // The board-true line names the student's move (Nc7), not the opponent's setup.
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.line).not.toMatch(/b5/); // opponent's setup move is context, not the lesson
    // The composed explanation is mechanics + idea.
    expect(r!.spoken).toContain(r!.idea!);
  });

  it('puts the lead-the-eye arrow on the student\'s KEY move, not the opponent\'s', () => {
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['fork'] });
    expect(r!.arrow).toEqual({ from: 'e6', to: 'c7' });
  });

  it('still returns the board-true mechanics when no concept maps (idea null)', () => {
    // A theme with no chess-concepts.json entry — the mechanics line still teaches.
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['short', 'endgame'] });
    expect(r).not.toBeNull();
    expect(r!.conceptId).toBeNull();
    expect(r!.idea).toBeNull();
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.spoken.length).toBeGreaterThan(0);
  });

  it('is G0-safe: never throws on a bad FEN or empty solution', () => {
    expect(explainPuzzleConcept({ fen: '', solutionUci: ['e2e4'], themes: ['fork'] })).toBeNull();
    expect(explainPuzzleConcept({ fen: FORK_FEN, solutionUci: [], themes: ['fork'] })).toBeNull();
    expect(explainPuzzleConcept({ fen: 'not a fen', solutionUci: ['e2e4'], themes: [] })).toBeNull();
  });

  it('explainDrillConcept teaches from a classroom drill (setupFen + SAN)', () => {
    // The classroom in-place drill is at the student-to-move position already.
    const c = new Chess(FORK_FEN);
    c.move('b7b5'); // opponent's setup applied
    const setupFen = c.fen(); // White (student) to move
    const r = explainDrillConcept({ setupFen, solutionSan: ['Nc7+'], themes: ['fork'] });
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.arrow).toEqual({ from: 'e6', to: 'c7' });
    expect(r!.idea).toMatch(/fork|two/i);
  });

  it('explainDrillConcept is G0-safe on bad input', () => {
    expect(explainDrillConcept({ setupFen: '', solutionSan: ['Nc7+'] })).toBeNull();
    expect(explainDrillConcept({ setupFen: FORK_FEN, solutionSan: [] })).toBeNull();
  });

  it('maps the mate patterns to their concept ideas', () => {
    // Back-rank: Black (opponent) shuffles, White (student) mates on the back rank.
    const fen = '6k1/5ppp/8/8/8/8/8/R3K3 b - - 0 1';
    const r = explainPuzzleConcept({ fen, solutionUci: ['g8h8', 'a1a8'], themes: ['backRankMate', 'mate'] });
    expect(r).not.toBeNull();
    expect(r!.conceptId).toBe('mate-back-rank');
    expect(r!.conceptName).toMatch(/back-rank/i);
  });
});
