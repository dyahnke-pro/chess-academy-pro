import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { squaresOfArrows, type PlanBeat } from './reviewStrategicOrientation';

// THE THIRD SHAPE (docs/plans/2026-09-17-computer-unification.md §0.2). The coach
// had three shapes for "a thing it says" — ComputedConcept (id + squares + two
// registers + importance), MoveFundamental (id + squares + three registers +
// weight), and PlanBeat, which carried text and arrows only.
//
// Not cosmetic: coachDecider's subsumption collapses facts that are the SAME
// CLAIM by comparing square sets, and G4.5.1 says a fact with NO squares is
// never collapsed. So every plan beat fell straight through subsumption, and
// with no id nothing could rank or dedupe it.
const SQ = /^[a-h][1-8]$/;

function assertShape(b: PlanBeat | null, what: string): PlanBeat {
  expect(b, `${what} produced nothing`).toBeTruthy();
  const beat = b as PlanBeat;
  expect(beat.id, `${what} has no id`).toBeTruthy();
  expect(Array.isArray(beat.squares), `${what} squares`).toBe(true);
  for (const s of beat.squares) expect(s, `${what} square "${s}"`).toMatch(SQ);
  return beat;
}

describe('PlanBeat carries an id and squares — so the decider can rank and subsume it', () => {
  it('an opponent move beat names BOTH squares of its own arrow', () => {
    // Measured, not guessed: a first attempt used 4.Ng5 "hitting f7" — but f7 is
    // king-defended, so nothing is loose and no branch fires. These three
    // positions were found by probing every legal move until a beat came back.
    const cases: Array<[string[], string, string[]]> = [
      [['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'], 'Bf4', ['f4', 'e5']],
      [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], 'Ndb5', ['b5', 'd4']],
      [['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'], 'Bd3', ['d3', 'e4']],
    ];
    for (const [line, san, wantSquares] of cases) {
      const c = new Chess();
      for (const m of line) c.move(m);
      const b = assertShape(buildOpponentMoveTeaching(c.fen(), san, 'b'), san);
      expect(b.id).toBe('opponent-move');
      expect(b.squares.sort()).toEqual([...wantSquares].sort());
      // whatever it claimed, the squares must cover every arrow it drew
      for (const s of squaresOfArrows(b.arrows)) expect(b.squares).toContain(s);
    }
  });

  it('the squares can never disagree with the arrows', () => {
    const c = new Chess();
    for (const m of ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6']) c.move(m);
    for (const san of ['Bg5', 'Nf3', 'cxd5']) {
      const probe = new Chess(c.fen());
      if (!probe.moves().includes(san)) continue;
      const b = buildOpponentMoveTeaching(c.fen(), san, 'b');
      if (!b) continue;
      for (const s of squaresOfArrows(b.arrows)) {
        expect(b.squares, `${san}: arrow square ${s} missing from squares`).toContain(s);
      }
    }
  });

  it('a whole-setup read is HONESTLY squareless — never an invented square', () => {
    // A beat about the shape of the opening has no square, and inventing one
    // would let subsumption silence a true, unrelated claim.
    const c = new Chess();
    const opp = ['e4', 'd4', 'f4', 'g4', 'h4'];
    for (const m of ['e4', 'e5', 'd4', 'exd4', 'f4', 'Nc6', 'g4', 'd5', 'h4', 'Bxg4']) {
      try { c.move(m); } catch { /* ignore */ }
    }
    const b = buildOpponentDevelopmentRead(opp, c.fen(), 'b');
    if (b) {
      expect(b.id).toBe('opponent-development');
      expect(b.squares).toEqual([]);
      expect(b.arrows).toEqual([]);
    }
  });

  it('squaresOfArrows dedupes and keeps both ends', () => {
    expect(squaresOfArrows([
      { startSquare: 'g5', endSquare: 'f7', color: '#fff' },
      { startSquare: 'g5', endSquare: 'e6', color: '#fff' },
    ]).sort()).toEqual(['e6', 'f7', 'g5']);
  });
});
