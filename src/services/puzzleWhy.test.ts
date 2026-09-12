import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildTacticWhy } from './puzzleWhy';

// Real chess.js (never mocked, per conventions) — the whole point of the helper
// is that every derived position/move is board-validated.
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('buildTacticWhy', () => {
  it('skips the opponent setup move and anchors the why on the student key move', () => {
    // Lichess shape: board set to `fen`, opponent plays moves[0], student solves.
    const line = ['e2e4', 'e7e5', 'g1f3', 'b8c6'];
    const why = buildTacticWhy(START, line);
    expect(why).not.toBeNull();

    const c = new Chess(START);
    c.move('e4'); // the opponent's setup move
    expect(why!.decisionFen).toBe(c.fen());

    expect(why!.keyMoveUci).toBe('e7e5');
    expect(why!.keyMoveSan).toBe('e5');
    // The play-out the grounded reasoning walks: student key move onward.
    expect(why!.pvUci).toEqual(['e7e5', 'g1f3', 'b8c6']);
  });

  it('resolves promotions in the key move SAN', () => {
    // White (opponent) to move; pushes to promote, then black (student) promotes.
    const fen = '8/P6k/8/8/8/8/6Kp/8 w - - 0 1';
    const line = ['a7a8q', 'h2h1q'];
    const why = buildTacticWhy(fen, line);
    expect(why).not.toBeNull();
    expect(why!.keyMoveUci).toBe('h2h1q');
    expect(why!.keyMoveSan).toBe('h1=Q+'); // promoting queen also gives check

  });

  it('returns null when there is no student move to explain (only the setup)', () => {
    expect(buildTacticWhy(START, ['e2e4'])).toBeNull();
    expect(buildTacticWhy(START, [])).toBeNull();
  });

  it('returns null on an unparseable FEN', () => {
    expect(buildTacticWhy('not a fen', ['e2e4', 'e7e5'])).toBeNull();
  });

  it('returns null when the setup or key move is illegal from the position', () => {
    expect(buildTacticWhy(START, ['e2e5', 'e7e5'])).toBeNull(); // illegal setup
    expect(buildTacticWhy(START, ['e2e4', 'e2e4'])).toBeNull(); // illegal key move
  });
});
