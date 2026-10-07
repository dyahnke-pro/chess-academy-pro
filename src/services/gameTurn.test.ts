// Unity U1 — ONE answer to "where did the game turn?" (52-error walk, R1: three
// "this is where the game turned" questions on the student's moves, then the
// closing named the OPPONENT's move, because a second computer ranked raw pawn
// swing over both sides).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gameTurn, type TurningPoint } from './turningPoints';
import { selectTeaching, renderThesis, type SelectorPly } from './teachingSelector';

const GAME = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7'];
// White-POV after each ply: Black's …Nf6 (ply 8) costs Black 2.1 pawns;
// White's Bb3 (ply 13) costs White 2.4 — the bigger RAW swing, the opponent's.
const EVALS = [20, 20, 25, 25, 30, 30, 30, 240, 235, 235, 230, 230, -10, -10, -5, -5, 0, 10, 10, 10, 10, 10];

function plies(): SelectorPly[] {
  const c = new Chess();
  let before = c.fen();
  let evalBefore = 0;
  return GAME.map((san, i) => {
    const mv = c.move(san);
    const p: SelectorPly = { ply: i + 1, san, fenBefore: before, fenAfter: c.fen(), playerColor: mv.color === 'w' ? 'white' : 'black', evalBefore, evalAfter: EVALS[i] };
    before = c.fen(); evalBefore = EVALS[i];
    return p;
  });
}

const asked = (ply: number, swing: number, san: string): TurningPoint => ({
  ply, fenBefore: '', playedSan: san, bestSan: 'x', bestUci: 'a1a2', swing, question: '', why: null, allowed: null, cause: null, causeCount: 0,
});

describe('gameTurn — the one turning point', () => {
  it('names the biggest move the review ASKED about, never the opponent’s bigger raw swing', () => {
    const t = gameTurn(new Map([[8, asked(8, 30, 'Nf6')]]), plies());
    expect(t).toMatchObject({ ply: 8, san: 'Nf6', source: 'asked' });
    expect(t!.swingPawns).toBeCloseTo(2.1, 5);
  });

  it('a game that asked nothing falls back to the biggest contested swing, by winning chance', () => {
    expect(gameTurn(new Map(), plies())?.ply).toBe(13);
  });

  it('the thesis leads with the handed-in turn, so the closing names the same move', () => {
    const pkg = selectTeaching({ plies: plies(), studentColor: 'black', kind: 'game', turnPly: 8 });
    expect(pkg.thesis.ply).toBe(8);
    expect(renderThesis(pkg.thesis, 'retrospective')).toMatch(/^The game turned at move 4, Nf6/);
    // Without it, the bigger raw swing (the opponent's) leads — the old bug.
    expect(selectTeaching({ plies: plies(), studentColor: 'black', kind: 'game' }).thesis.ply).toBe(13);
  }, 30_000);   // the selector runs the tactic detectors per ply
});
