import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { theoryViewSteps } from './theoryPlayback';
import type { LectureStep } from './reviewOpeningTheory';

// A real game's boards: 1.e4 c5 2.Nf3 d6 3.Bb5+ — left book on move 3.
const boards = (() => { const c = new Chess(); const out = [c.fen()]; for (const s of ['e4', 'c5', 'Nf3', 'd6', 'Bb5+']) { c.move(s); out.push(c.fen()); } return out; })();
const steps: LectureStep[] = [
  { kind: 'position', fen: boards[0] },
  { kind: 'say', text: "Let's dig into the theory.", fen: boards[0] },
  { kind: 'position', fen: boards[2] },
  { kind: 'say', text: 'Nf3 is the standard move here.', fen: boards[2] },
  { kind: 'position', fen: boards[4] },
  { kind: 'say', text: 'd4 is the main line.', fen: boards[4] },
];

describe('the theory view plays forward from where the game left book', () => {
  it('keeps the opening line, then starts at the departure board', () => {
    expect(theoryViewSteps(steps, boards[4])).toEqual([steps[0], steps[1], steps[4], steps[5]]);
  });
  it('twins: still in book, or a departure the lecture never reached → the whole lecture', () => {
    expect(theoryViewSteps(steps, null)).toEqual(steps);
    expect(theoryViewSteps(steps, boards[5])).toEqual(steps);
  });
});
