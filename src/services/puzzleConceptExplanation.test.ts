import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainPuzzleConcept, explainDrillConcept, conceptIdeaForThemes } from './puzzleConceptExplanation';

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

  it('the BOARD names the concept even when the tags do not (P3: one computational system)', () => {
    // No motif tag at all — the engine still classifies Nc7+ as the fork, so the
    // hint/explanation teaches it; only the book-passage sourcing id is missing.
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['short', 'endgame'] });
    expect(r).not.toBeNull();
    expect(r!.conceptId).toBeNull();
    expect(r!.computedId).toBe('fork');
    expect(r!.computedSource).toBe('tactic');
    expect(r!.conceptName).toBe('Fork');
    expect(r!.idea).toMatch(/two targets/);
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.spoken).toContain(r!.idea!);
  });

  it('an endgame-technique solution teaches the technique the board reaches', () => {
    // Opponent …Kd6, student Kd4 — direct opposition / key square with the e2 pawn.
    const r = explainPuzzleConcept({ fen: '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', solutionUci: ['d5d6', 'd3d4'], themes: ['endgame', 'pawnEndgame'] });
    expect(r).not.toBeNull();
    expect(['key-squares', 'opposition']).toContain(r!.computedId);
    expect(r!.computedSource).toBe('technique');
    expect(r!.idea).toMatch(/key square|opposition/i);
  });

  it('a delivered mate is named by its pattern', () => {
    const r = explainPuzzleConcept({ fen: '5r1k/6pp/8/6N1/8/8/8/7K b - - 0 1', solutionUci: ['f8g8', 'g5f7'], themes: ['mate', 'mateIn1'] });
    expect(r!.computedId).toBe('smothered-mate');
    expect(r!.conceptName).toBe('Smothered Mate');
    expect(r!.idea).toMatch(/Smothered Mate — /);
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

  it('conceptIdeaForThemes gives the pattern name + idea for a HINT, no move given away', () => {
    const r = conceptIdeaForThemes(['fork', 'long']);
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.conceptId).toBe('tac-fork');
    expect(r!.idea).toMatch(/fork|two/i);
    // It's the general idea — no square/move leaked.
    expect(r!.idea).not.toMatch(/\b[a-h][1-8]\b/);
  });

  it('conceptIdeaForThemes is null when no known concept maps', () => {
    expect(conceptIdeaForThemes(['short', 'endgame'])).toBeNull();
    expect(conceptIdeaForThemes([])).toBeNull();
  });

  it('conceptIdeaForThemes with a board: the computed concept beats the tags', () => {
    const c = new Chess(FORK_FEN); c.move('b7b5');
    const r = conceptIdeaForThemes(['pin'], { fen: c.fen(), uci: ['e6c7'], studentToMove: true });
    expect(r!.conceptName).toBe('Fork'); // the board says fork, the (wrong) tag said pin
    expect(r!.idea).toMatch(/two targets/);
    expect(r!.idea).not.toMatch(/\b[a-h][1-8]\b/); // the invariant leaks no square
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
