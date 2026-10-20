// OS-11 census 5 — ONE answer to "where did the game turn?": one list over
// every move of both sides, ranked by the winning chance it cost its mover.
// The thesis takes its top entry; the review's questions take the student's
// entries of the same list.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gameTurn, rankTurns } from './turningPoints';
import { selectTeaching, renderThesis, type SelectorPly } from './teachingSelector';

function pliesOf(game: string[], evals: number[]): SelectorPly[] {
  const c = new Chess();
  let before = c.fen();
  let evalBefore = 0;
  return game.map((san, i) => {
    const mv = c.move(san);
    const p: SelectorPly = { ply: i + 1, san, fenBefore: before, fenAfter: c.fen(), playerColor: mv.color === 'w' ? 'white' : 'black', evalBefore, evalAfter: evals[i] };
    before = c.fen(); evalBefore = evals[i];
    return p;
  });
}

const GAME = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7'];
// The two old rankings DISAGREE here. White's Bb3 (ply 13): +600 → +300 — the
// bigger raw pawn swing (3 pawns), but White is still winning after it, so it
// costs ~15 points of winning chance into a decided game and turns nothing.
// Black's …Nbd7 (ply 20): +50 → +250 for White — 2 pawns, ~18 points of
// winning chance, from a level game. The old selector (pawn swing) named
// Bb3; the old card (winning chance) named …Nbd7.
const EVALS = [20, 20, 25, 25, 30, 30, 30, 30, 30, 30, 600, 600, 300, 300, 300, 300, 300, 50, 50, 250];

describe('one turn ranking — card and thesis agree', () => {
  it('the ranking is winning chance lost, either side; a decided-game swing is not on it', () => {
    const turns = rankTurns(pliesOf(GAME, EVALS));
    expect(turns.map((t) => t.ply)).not.toContain(13);
    expect(turns[0].ply).toBe(20);
  });

  it('the game turn, the thesis and the student\'s question name the same move', () => {
    const plies = pliesOf(GAME, EVALS);
    const turn = gameTurn(plies);
    expect(turn).toMatchObject({ ply: 20, san: 'Nbd7', mover: 'black' });
    const pkg = selectTeaching({ plies, studentColor: 'black', kind: 'game' });
    expect(pkg.thesis.ply).toBe(20);
    expect(renderThesis(pkg.thesis, 'retrospective')).toMatch(/^The game turned at move 10, Nbd7/);
  }, 30_000);

  it('when the turn was the opponent\'s move, the thesis says it was theirs', () => {
    const pkg = selectTeaching({ plies: pliesOf(GAME, EVALS), studentColor: 'white', kind: 'game' });
    expect(pkg.thesis.ply).toBe(20);
    expect(renderThesis(pkg.thesis, 'retrospective')).toMatch(/^The game turned at their move, move 10, Nbd7/);
  }, 30_000);
});
