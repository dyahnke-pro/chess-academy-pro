import { describe, it, expect } from 'vitest';
import { conceptHintForPuzzle, pickConceptHint } from './puzzleConceptHint';

describe('conceptHintForPuzzle — the ONE hint source (P3)', () => {
  it('the board-computed short register leads over the tag table', () => {
    // Lichess shape: …b5 (setup), then Nc7+ forks king + rook. Tagged only "endgame".
    const hint = conceptHintForPuzzle({ fen: 'r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1', moves: 'b7b5 e6c7', themes: ['endgame'] });
    expect(hint).toMatch(/^Fork/);
  });

  it('a game-derived puzzle (student to move) classifies from its own turn', () => {
    const hint = conceptHintForPuzzle({ fen: 'r3k3/1p6/4N3/8/8/8/8/4K3 w - - 0 1', moves: ['e6c7'], themes: [], studentToMove: true });
    expect(hint).toMatch(/^Fork/);
  });

  it('falls back to the tag table when the board classifies nothing', () => {
    // A quiet developing move — no tactic, no ending → the tag decides.
    const hint = conceptHintForPuzzle({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e2e4 e7e5', themes: ['quietMove'] });
    expect(hint).toBe(pickConceptHint(['quietMove']));
  });

  it('never throws on garbage', () => {
    expect(conceptHintForPuzzle({ fen: 'nope', moves: 'zz', themes: ['fork'] })).toBe('Find the fork');
  });
});
