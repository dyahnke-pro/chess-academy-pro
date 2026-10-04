import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainPuzzleConcept, explainDrillConcept, conceptIdeaForThemes } from './puzzleConceptExplanation';

describe('explainPuzzleConcept (teach the concept behind the solution)', () => {
  // Black (opponent) to move plays a quiet pawn push; White (student) answers
  // Nc7+ — a knight fork of the king on e8 and the rook on a8.
  const FORK_FEN = 'r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1';
  const FORK_SOLUTION = ['b7b5', 'e6c7'];

  it('names the concept, computes the line, and carries the general idea', () => {
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['fork'] });
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.conceptId).toBe('tac-fork');
    // The general idea (from chess-concepts.json) teaches WHY a fork works.
    expect(r!.idea).toMatch(/fork|two/i);
    // The board-true line names the student's move (Nc7), not the opponent's setup.
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.line).not.toMatch(/b5/); // opponent's setup move is context, not the lesson
    // The composed explanation is mechanics + idea.
    expect(r!.spoken).toContain(r!.idea!);
  });

  it('puts the lead-the-eye arrow on the student\'s KEY move, not the opponent\'s', () => {
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['fork'] });
    expect(r!.arrow).toEqual({ from: 'e6', to: 'c7' });
  });

  it('the BOARD names the concept even when the tags do not (P3: one computational system)', () => {
    // No motif tag at all — the engine still classifies Nc7+ as the fork, so the
    // hint/explanation teaches it; only the book-passage sourcing id is missing.
    const r = explainPuzzleConcept({ fen: FORK_FEN, solutionUci: FORK_SOLUTION, themes: ['short', 'endgame'] });
    expect(r).not.toBeNull();
    expect(r!.conceptId).toBeNull();
    expect(r!.computedId).toBe('fork');
    expect(r!.computedSource).toBe('tactic');
    expect(r!.conceptName).toBe('Fork');
    expect(r!.idea).toMatch(/two targets/);
    // The explanation names WHAT is forked (the instance), not just "a fork".
    expect(r!.idea).toMatch(/forks .*a8|forks .*e8|king|rook/i);
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.spoken).toContain(r!.idea!);
  });

  it('an endgame-technique solution teaches the technique the board reaches', () => {
    // Opponent …Kd6, student Kd4 — direct opposition / key square with the e2 pawn.
    const r = explainPuzzleConcept({ fen: '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', solutionUci: ['d5d6', 'd3d4'], themes: ['endgame', 'pawnEndgame'] });
    expect(r).not.toBeNull();
    expect(['key-squares', 'opposition']).toContain(r!.computedId);
    expect(r!.computedSource).toBe('technique');
    expect(r!.idea).toMatch(/key square|opposition/i);
  });

  it('a delivered mate is named by its pattern', () => {
    const r = explainPuzzleConcept({ fen: '5r1k/6pp/8/6N1/8/8/8/7K b - - 0 1', solutionUci: ['f8g8', 'g5f7'], themes: ['mate', 'mateIn1'] });
    expect(r!.computedId).toBe('smothered-mate');
    expect(r!.conceptName).toBe('Smothered Mate');
    // After the mate the pattern is NAMED, never described with recognition
    // advice that may be false of this king ("…in the corner").
    expect(r!.idea).toBe('That pattern is called Smothered Mate.');
  });

  it('after a delivered mate, nothing speaks of the mate as still coming', () => {
    // Student (Black) Qxf2+ Kh2 Qxg2# — classified only as a mating threat.
    const r = explainDrillConcept({ setupFen: '8/2Q3bk/2p2q1p/N1P4P/6p1/6N1/2r2PP1/1R4K1 b - - 0 1', solutionSan: ['Qxf2+', 'Kh2', 'Qxg2#'] });
    expect(r!.conceptName).toBe('Checkmate');
    expect(r!.spoken).not.toMatch(/is coming|unless/i);
    expect(r!.spoken).not.toMatch(/checkmate.*checkmate/i);
    // The opponent's reply is theirs, not the student's.
    expect(r!.spoken).toMatch(/They answer the check with Kh2/);
  });

  it('is G0-safe: never throws on a bad FEN or empty solution', () => {
    expect(explainPuzzleConcept({ fen: '', solutionUci: ['e2e4'], themes: ['fork'] })).toBeNull();
    expect(explainPuzzleConcept({ fen: FORK_FEN, solutionUci: [], themes: ['fork'] })).toBeNull();
    expect(explainPuzzleConcept({ fen: 'not a fen', solutionUci: ['e2e4'], themes: [] })).toBeNull();
  });

  it('explainDrillConcept teaches from a classroom drill (setupFen + SAN)', () => {
    // The classroom in-place drill is at the student-to-move position already.
    const c = new Chess(FORK_FEN);
    c.move('b7b5'); // opponent's setup applied
    const setupFen = c.fen(); // White (student) to move
    const r = explainDrillConcept({ setupFen, solutionSan: ['Nc7+'], themes: ['fork'] });
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.line).toMatch(/Nc7/);
    expect(r!.arrow).toEqual({ from: 'e6', to: 'c7' });
    expect(r!.idea).toMatch(/fork|two/i);
  });

  it('explainDrillConcept is G0-safe on bad input', () => {
    expect(explainDrillConcept({ setupFen: '', solutionSan: ['Nc7+'] })).toBeNull();
    expect(explainDrillConcept({ setupFen: FORK_FEN, solutionSan: [] })).toBeNull();
  });

  it('conceptIdeaForThemes gives the pattern name + idea for a HINT, no move given away', () => {
    const r = conceptIdeaForThemes(['fork', 'long']);
    expect(r).not.toBeNull();
    expect(r!.conceptName).toBe('Fork');
    expect(r!.conceptId).toBe('tac-fork');
    expect(r!.idea).toMatch(/fork|two/i);
    // It's the general idea — no square/move leaked.
    expect(r!.idea).not.toMatch(/\b[a-h][1-8]\b/);
  });

  it('conceptIdeaForThemes is null when no known concept maps', () => {
    expect(conceptIdeaForThemes(['short', 'endgame'])).toBeNull();
    expect(conceptIdeaForThemes([])).toBeNull();
  });

  it('conceptIdeaForThemes with a board: the computed concept beats the tags', () => {
    const c = new Chess(FORK_FEN); c.move('b7b5');
    const r = conceptIdeaForThemes(['pin'], { fen: c.fen(), uci: ['e6c7'], studentToMove: true });
    expect(r!.conceptName).toBe('Fork'); // the board says fork, the (wrong) tag said pin
    expect(r!.idea).toMatch(/two targets/);
    expect(r!.idea).not.toMatch(/\b[a-h][1-8]\b/); // the invariant leaks no square
  });

  it('maps the mate patterns to their concept ideas', () => {
    // Back-rank: Black (opponent) shuffles, White (student) mates on the back rank.
    const fen = '6k1/5ppp/8/8/8/8/8/R3K3 b - - 0 1';
    const r = explainPuzzleConcept({ fen, solutionUci: ['g8h8', 'a1a8'], themes: ['backRankMate', 'mate'] });
    expect(r).not.toBeNull();
    expect(r!.conceptId).toBe('mate-back-rank');
    expect(r!.conceptName).toMatch(/back-rank/i);
  });
});

/** Real Lichess puzzles from src/data/puzzles.json whose post-solve
 *  explanation the live walk (2026-10-03) heard garbled — "the king trains on
 *  the knight on e2 — pressure they have to answer", a motif credited to the
 *  OPPONENT's reply, a filler clause on every ply including after the win. */
describe('puzzle explanation reads like a coach (live walk 2026-10-03)', () => {
  const FILLER = /trains on|pressure they have to answer|highway|bears down|fighting for the center|steps toward safety|crossfire|marches up|stops hiding|landing a/i;
  const explain = (fen: string, moves: string, themes: string[]): ReturnType<typeof explainPuzzleConcept> =>
    explainPuzzleConcept({ fen, solutionUci: moves.split(' '), themes });

  it('0CCT1 Ne2+ Kf1 Nxc3: the fork once, their reply plainly, the result', () => {
    const r = explain('7R/1p4r1/1kp1P3/1p4p1/1q3nBp/5N1P/1PQ2PP1/6K1 w - - 3 33', 'c2c3 f4e2 g1f1 e2c3', ['crushing', 'fork', 'middlegame', 'short']);
    expect(r).not.toBeNull();
    expect(r!.spoken).not.toMatch(FILLER);
    // The motif sentence is said exactly once, right after the move that lands it.
    expect(r!.spoken.match(/forks queen on c3 and king on g1/g)).toHaveLength(1);
    expect(r!.spoken.indexOf('forks')).toBeGreaterThan(r!.spoken.indexOf('Ne2+'));
    expect(r!.spoken.indexOf('forks')).toBeLessThan(r!.spoken.indexOf('Kf1'));
    expect(r!.spoken).toMatch(/They answer the check with Kf1\./);
    expect(r!.spoken).toMatch(/Nxc3, and you win the queen\./);
    expect(r!.ideaClause).toBe(0);
    expect(r!.clauses[0]).toContain(r!.idea!);
  });

  it('a motif is never credited to the opponent\'s reply', () => {
    // 08oXh: …Qd8+ Rxd8 Rxd8# — the old line said "Rxd8, they take the queen,
    // landing a removal of the defender" about the opponent's capture.
    const r = explain('2r3k1/5ppp/3Q4/p3n1P1/1p2PR1P/P1P1q3/1P6/1K1R4 b - - 2 27', 'e3f4 d6d8 c8d8 d1d8', ['backRankMate', 'endgame', 'mate', 'mateIn2', 'sacrifice', 'short']);
    expect(r).not.toBeNull();
    const opponentSentences = r!.clauses.filter((c) => /^They/.test(c));
    expect(opponentSentences.length).toBeGreaterThan(0);
    for (const s of opponentSentences) {
      expect(s).not.toMatch(/landing|fork|pin|skewer|discovered|defender|attack/i);
    }
    expect(r!.spoken).toMatch(/They have to take your queen with Rxd8\./);
    expect(r!.spoken).toMatch(/Rxd8# is checkmate\./);
    expect(r!.spoken).toMatch(/Back-Rank Mate/);
    expect(r!.spoken).not.toMatch(FILLER);
  });

  it('a recapture is "take back", and a multi-capture line nets out ("a rook")', () => {
    const r = explain('r5k1/ppp1B1pp/6r1/b5N1/3nP3/2p5/P4PPP/RNR3K1 w - - 1 17', 'b1c3 a5c3 c1c3 d4e2 g1f1 e2c3', ['attraction', 'crushing', 'fork', 'long', 'middlegame']);
    expect(r).not.toBeNull();
    expect(r!.spoken).toMatch(/Bxc3 takes the knight\. They take back with Rxc3\. Then Ne2\+\./);
    expect(r!.spoken).toMatch(/Nxc3, and you win a rook\.$/);
    expect(r!.spoken).not.toMatch(FILLER);
  });

  it('no filler on a king walk (0JGVg Re1+ Kd3 … Rxd8)', () => {
    const r = explain('8/8/4k2p/4p2P/p3K1P1/P2R1P2/8/1r6 w - - 2 57', 'd3d8 b1e1 e4d3 e1d1 d3c3 d1d8', ['crushing', 'endgame', 'long', 'rookEndgame', 'skewer']);
    expect(r).not.toBeNull();
    expect(r!.spoken).not.toMatch(FILLER);
    expect(r!.spoken).toMatch(/They have to play Kd3\./);
    expect(r!.spoken).toMatch(/Rxd8, and you win a rook\./);
  });

  it('every SAN it writes is the board\'s own notation', () => {
    const fen = '7R/1p4r1/1kp1P3/1p4p1/1q3nBp/5N1P/1PQ2PP1/6K1 w - - 3 33';
    const uci = ['c2c3', 'f4e2', 'g1f1', 'e2c3'];
    const r = explain(fen, uci.join(' '), ['fork']);
    const c = new Chess(fen);
    const legal = uci.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4) }).san);
    for (const san of legal.slice(1)) expect(r!.line).toContain(san);
  });
});

describe('a take-back is only a take-back of a capture (2026-10-04)', () => {
  it('a pawn pushed and then taken was won, not recaptured', () => {
    const c = new Chess();
    c.move('d4'); c.move('d5'); c.move('Nf3');
    const r = explainDrillConcept({ setupFen: c.fen(), solutionSan: ['c5', 'dxc5'] });
    expect(r!.spoken).toMatch(/They take your pawn with dxc5\./);
    expect(r!.spoken).not.toMatch(/take back/);
  });
});
