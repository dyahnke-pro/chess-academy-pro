import { describe, it, expect } from 'vitest';
import { assembleOpponentMoveAnswer } from './groundedAnswer';

// P-IV.1 — "why did they play that?" The opponent's last move, explained from
// chess.js geometry + the standing threat. Self-gates on the position.
describe('assembleOpponentMoveAnswer — opponent last-move why (P-IV.1)', () => {
  it('explains a capturing opponent move and names it as theirs', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 — White (opponent) just captured on c6.
    // Student is Black, now to move.
    const history = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'];
    // FEN after 4.Bxc6 (Black to move):
    const fen = 'r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4';
    const a = assembleOpponentMoveAnswer({ fen, moveHistory: history, studentColor: 'black' });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/They played Bxc6/);
    expect(a!.facts.toLowerCase()).toContain('c6');
    expect(a!.sources).toContain('chess.js');
  });

  it('self-gates: returns null when the STUDENT moved last (their turn to ask makes no sense)', () => {
    // After 1.e4 (White/student just moved), Black to move — the last move was
    // the STUDENT's, so the opponent-move lane must NOT fire.
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const a = assembleOpponentMoveAnswer({ fen, moveHistory: ['e4'], studentColor: 'white' });
    expect(a).toBeNull();
  });

  it('returns null with no move history', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(assembleOpponentMoveAnswer({ fen, moveHistory: [], studentColor: 'white' })).toBeNull();
    expect(assembleOpponentMoveAnswer({ fen, moveHistory: undefined, studentColor: 'white' })).toBeNull();
  });
});
