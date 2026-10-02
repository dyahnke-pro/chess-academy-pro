// EVERY MOVE A PUZZLE SAYS, ON THE BOARD (David 2026-10-02: "Make sure all
// stated moves have arrows"). His calls: the opponent's punishing reply is RED,
// the student's bad move gets NO arrow, a move already on the board keeps its
// highlight only, and a follow-up resolves on the board AFTER the move before
// it — never on a turn-flipped guess.
import { describe, it, expect } from 'vitest';
import { spokenLineArrows, LINE_ARROW_GOOD, LINE_ARROW_THREAT } from './arrowEngine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White to move; Black's queen on d8, a white bishop on b5 hanging to nothing.
const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

const pairs = (a: Array<{ startSquare: string; endSquare: string; color: string }>): string[] =>
  a.map((x) => `${x.startSquare}${x.endSquare}:${x.color === LINE_ARROW_THREAT ? 'red' : x.color === LINE_ARROW_GOOD ? 'green' : '?'}`);

describe('spokenLineArrows', () => {
  it('a wrong try: your move none, their punishing reply red, resolved AFTER your move', () => {
    expect(pairs(spokenLineArrows('d6? Then Ng5, hitting f7 twice.', ITALIAN, { studentColor: 'b', studentMovesAreBad: true })))
      .toEqual(['f3g5:red']);
  });

  it('a pawn reply after "then" is a move', () => {
    expect(pairs(spokenLineArrows('e4? Then d5, striking the centre.', START, { studentColor: 'w', studentMovesAreBad: true })))
      .toEqual(['d7d5:red']);
  });

  it('a good line: your follow-up green, their reply red', () => {
    expect(pairs(spokenLineArrows('e4, then e5, then Nf3.', START, { studentColor: 'w' })))
      .toEqual(['e2e4:green', 'e7e5:red', 'g1f3:green']);
  });

  it('a move already on the board keeps its highlight — no arrow', () => {
    expect(pairs(spokenLineArrows('Nf3, then Nc6.', START, { studentColor: 'w', exclude: [{ from: 'g1', to: 'f3' }] })))
      .toEqual(['b8c6:red']);
  });

  it('squares in a list are squares, not pawn moves', () => {
    expect(spokenLineArrows('It repositions the bishop to e6, eyeing d5, c4 and f5.', START, { studentColor: 'w' })).toEqual([]);
    expect(spokenLineArrows('The key square is e6. What can reach it?', START, { studentColor: 'w' })).toEqual([]);
  });

  it('a move that will not play along the line is skipped, never guessed', () => {
    expect(spokenLineArrows('Qh5 wins.', START, { studentColor: 'w' })).toEqual([]);
  });
});
