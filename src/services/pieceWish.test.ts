import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { pieceWish } from './pieceWish';
import { detectBehaviors } from './danyaBehaviors';
import { NO_SECOND_READ } from './inaccuracyCall';
import { namesFromArrows, namesPlayableStudentMove } from './studentMoveNaming';

// THE PIECE THAT WANTS A BETTER SQUARE — one computer, Learn and Review
// (wire-19, 2026-11-08). Review's worst-piece facet said "your worst-placed
// piece is the knight on a5 — it has almost no squares, so the plan is to
// reroute it somewhere it actually does a job": no square, no job. Learn's
// piece-activity behaviour already named the square and why; both read
// `pieceWish` now.

// lichess SI5q0VJz (Caro-Kann Advance, 1633–1643) after 18…Qxb2: Black's
// knight sits on a5, and c4 is a hole no White pawn can reach, backed by d5.
const SI5 = (() => {
  const g = new Chess(); g.loadPgn(readFileSync('src/services/__fixtures__/SI5q0VJz.pgn', 'utf8'));
  return g.history();
})();
function boardAt(ply: number): { before: string; after: string; san: string } {
  const c = new Chess();
  for (const s of SI5.slice(0, ply - 1)) c.move(s);
  const before = c.fen();
  c.move(SI5[ply - 1]);
  return { before, after: c.fen(), san: SI5[ply - 1] };
}

describe('pieceWish — which piece, which square, and why', () => {
  it('names the rim knight, its outpost and the pawn that backs it', () => {
    const { after } = boardAt(36);
    const w = pieceWish(after, 'b', null);
    expect(w?.text).toBe('Your knight on a5 is stuck on the rim. It wants c4, an outpost no pawn can chase it from, and the d-pawn backs it up.');
    expect(w?.target).toBe('c4');
  });

  it('a bishop behind its own pawns says the diagonal it would get (David\'s game chesscom-143330713558, move 31)', () => {
    const w = pieceWish('6r1/pp1b3p/2p1pk2/3pR3/6P1/1P1P3P/1PP5/6K1 w - - 3 31', 'b', null);
    expect(w?.text).toBe('Your bishop is hemmed in behind its own pawns. It wants g6, where it sweeps a long diagonal instead of 4 squares.');
  });

  it('never the piece the move just put there', () => {
    const { after } = boardAt(36);
    expect(pieceWish(after, 'b', 'a5')).toBeNull();
  });

  it('stays quiet in the opening, where a piece is passive because it is not out yet', () => {
    const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Na3']) c.move(s);
    expect(pieceWish(c.fen(), 'w', null)).toBeNull();
  });
});

describe('ONE computer: Review\'s worst-piece facet and Learn\'s wish say the same line', () => {
  it('Review names the square the knight wants (the old facet named none)', async () => {
    const { computeMoveFacets, NO_TEACHING_CONTEXT } = await import('./reviewFullData');
    const { before, after, san } = boardAt(36);
    const facets = computeMoveFacets({ secondReads: NO_SECOND_READ, seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: before, fenAfter: after, san, ply: 36, moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: null, preMoveEval: null, costCp: null, heardVerdict: null, classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: SI5, forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null, replyEvaluation: null });
    const worst = facets.find((f) => f.tag === 'worst');
    expect(worst?.text).toBe(pieceWish(after, 'b', 'b2')?.text);
    expect(worst?.text).toMatch(/It wants c4/);
    expect(worst?.squares).toEqual(['a5', 'c4']);
    expect(facets.map((f) => f.text).join(' ')).not.toMatch(/somewhere it actually does a job/);
  }, 30_000);

  it('Learn\'s piece-activity behaviour speaks the wish computer\'s line', () => {
    // The same board without Black's rook (a rook on a half-open file is the
    // good piece the behaviour praises first), so it reaches the wish.
    const fen = '8/pp1b3p/2p1pk2/3pR3/6P1/1P1P3P/1PP5/6K1 b - - 3 31';
    const hit = detectBehaviors({ fen, studentColor: 'black' }).find((h) => h.id === 'piece-activity');
    expect(hit?.fact).toBe(pieceWish(fen, 'b', null)?.text);
    expect(hit?.kind).toBe('wishlist');
    expect(hit?.keys).toEqual(['wishlist:g6']);
  });

  it('Learn: a one-move wish names the student\'s move, so the door holds it; a longer route lights no stop (David\'s game chesscom-1002984876, after 21.Nc3)', () => {
    const fen = 'r1k5/p1pn3p/8/1pb3p1/8/2N2PBn/PPP4P/2K2R2 b - - 3 21';
    const hit = detectBehaviors({ fen, studentColor: 'black' }).find((h) => h.kind === 'wishlist');
    expect(hit?.fact).toMatch(/It wants f4/);
    expect(namesPlayableStudentMove(namesFromArrows(hit?.arrows, 'b', fen))).toBe(true);
    const two = '8/pp1b3p/2p1pk2/3pR3/6P1/1P1P3P/1PP5/6K1 b - - 3 31';
    const route = detectBehaviors({ fen: two, studentColor: 'black' }).find((h) => h.kind === 'wishlist');
    expect(route?.squares).toEqual(['d7', 'g6']);
    expect(route?.arrows ?? []).toEqual([]);
  });
});
