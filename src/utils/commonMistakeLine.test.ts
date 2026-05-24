import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { commonMistakeToPlayableLine } from './commonMistakeLine';
import type { CommonMistake } from '../types';

const VIENNA_BC5: CommonMistake = {
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
  wrongMove: 'Bc5',
  correctMove: 'Nf6',
  explanation: 'Bc5 is passive and allows f4 with tempo. Nf6 counter-attacks e4.',
};

describe('commonMistakeToPlayableLine', () => {
  it('synthesizes a one-move antidote line that plays the CORRECT move', () => {
    const line = commonMistakeToPlayableLine(VIENNA_BC5);
    expect(line).not.toBeNull();
    expect(line!.fen).toBe(VIENNA_BC5.fen);
    expect(line!.moves).toEqual(['Nf6']);
    expect(line!.annotations).toEqual([VIENNA_BC5.explanation]);
  });

  it('only ever plays a real, legal move (G3 — never drills the wrong move)', () => {
    const line = commonMistakeToPlayableLine(VIENNA_BC5)!;
    const c = new Chess(line.fen);
    expect(() => c.move(line.moves[0])).not.toThrow();
    expect(line.moves).not.toContain(VIENNA_BC5.wrongMove);
  });

  it('leads the eye: green arrow on the correct move, red arrow on the wrong move', () => {
    const line = commonMistakeToPlayableLine(VIENNA_BC5)!;
    expect(line.arrows[0].length).toBe(2);
    const [played, tempting] = line.arrows[0];
    expect(played.color).toContain('34, 197, 94'); // green = the move played
    expect(tempting.color).toContain('239, 68, 68'); // red = the tempting error
  });

  it('returns the hand-authored punishmentLine verbatim when present', () => {
    const authored = {
      fen: VIENNA_BC5.fen,
      moves: ['Bc5', 'd4'],
      annotations: ['x', 'y'],
      arrows: [[], []],
      title: 'authored',
    };
    const line = commonMistakeToPlayableLine({ ...VIENNA_BC5, punishmentLine: authored });
    expect(line).toBe(authored);
  });

  it('returns null when the correct move is not legal in the position (graceful skip)', () => {
    const broken: CommonMistake = { ...VIENNA_BC5, correctMove: 'Zz9' };
    expect(commonMistakeToPlayableLine(broken)).toBeNull();
  });
});
