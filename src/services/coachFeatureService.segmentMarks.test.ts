import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { segmentMarks } from './coachFeatureService';

// NO MARKS WITHOUT WORDS (G8.5 rule 3, marks sweep 2026-11-08): Review drew the
// better move's arrow on every costly move, said or not — their Rac8's beat
// taught what the move allowed and never named Kg8, and the arrow went up at
// the turn's end with nothing said.
const board = new Chess();
for (const m of ['e4', 'e5', 'Nf3']) board.move(m);
const fenBefore = board.fen();
board.move('f6');
const fenAfter = board.fen();
const seg = (narration: string) => ({
  narration, fenBefore, fenAfter, classification: 'mistake' as const, bestMoveUci: 'b8c6',
  keySquares: [], keySquareSaid: [], planArrows: undefined, planArrowsSaid: undefined,
  spokenLineArrows: undefined, spokenLineSaid: undefined,
});
const hasBetter = (n: string) => segmentMarks(seg(n), 'black').arrows.some((a) => a.startSquare === 'b8' && a.endSquare === 'c6');

describe('Review draws the better move only when the beat says it', () => {
  it('words that never name the better move draw no arrow for it', () => {
    expect(hasBetter('Your f6 was a mistake. It loosens your own king, and a pawn never moves back.')).toBe(false);
  });
  it('words that name it draw it', () => {
    expect(hasBetter('Your f6 was a mistake. Nc6 was stronger: it would develop your knight.')).toBe(true);
  });
});
