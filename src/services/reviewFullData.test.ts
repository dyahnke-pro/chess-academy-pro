import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, computeThroughLine } from './reviewFullData';

/** FENs after each SAN (index i = position after ply i+1). */
function fensAfter(sans: string[]): string[] {
  const c = new Chess();
  const out: string[] = [];
  for (const s of sans) { c.move(s); out.push(c.fen()); }
  return out;
}

const SICILIAN_IQP = ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd5', 'exd5', 'exd5', 'Be2', 'Be7', 'O-O', 'O-O', 'Bg5', 'Be6', 'Re1', 'Nc6', 'Nxc6', 'bxc6', 'Bf3', 'Qd6'];

describe('computeMoveFacets (David 2026-07-20 — uncapped full-data inventory)', () => {
  it('emits multiple board-true facets on one move (verdict, structure, opening)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const ply = 19; // Re1 — White owns the open e-file, Black has the isolated d5
    const facets = computeMoveFacets({
      fenBefore: fens[ply - 2],
      fenAfter: fens[ply - 1],
      san: 'Re1',
      ply,
      moverColor: 'white',
      playerColor: 'white',
      studentColorWB: 'w',
      evaluation: 150,
      preMoveEval: 15,
      classification: 'great',
      bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 },
      allSans: SICILIAN_IQP,
      forcedRunStartPly: null,
    });
    const all = facets.join(' ');
    expect(facets.length).toBeGreaterThanOrEqual(3);
    expect(all).toMatch(/\[verdict\]/);
    expect(all).toMatch(/clearly better/i);
    expect(all).toMatch(/\[structure\]/);
    expect(all).toMatch(/open files e/i);
    expect(all).toMatch(/\[opening\]/);
  });

  it('attributes a non-good OPPONENT move to the opponent, never the student (opera ply-14 bug)', () => {
    // A quiet opponent move (…Qe7) yields no [move] mechanics facet, so [quality]
    // is the only mover clue. It MUST carry "Your opponent:" — else the LLM credits
    // Black's move to the White student ("a great move from you"). David 2026-07-20.
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[16], fenAfter: fens[17], san: 'Be6', ply: 18,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 150, preMoveEval: 150, classification: 'great', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    const quality = facets.find((f) => f.startsWith('[quality]'));
    expect(quality).toBeDefined();
    expect(quality).toMatch(/Your opponent:/);
    expect(quality).not.toMatch(/^\[quality\] You:/);
  });

  it('attributes a non-good STUDENT move to the student', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[18], fenAfter: fens[19], san: 'Nc6', ply: 20,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 20, preMoveEval: 150, classification: 'inaccuracy', bestMoveSan: 'Nd7',
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    const quality = facets.find((f) => f.startsWith('[quality]'));
    expect(quality).toMatch(/^\[quality\] You:/);
  });

  it('does NOT grade the student\'s forced-mate move an inaccuracy (opera ply-29 bug)', () => {
    // 15.Bxd7+ starts the Opera forced mate (…Nxd7 Qb8+ Nxb8 Rd8#); a shallow
    // analysis mis-grades it "inaccuracy". Inside the student's own forced mate,
    // that negative [quality] must be suppressed — no [quality] facet at all.
    const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];
    const fens = fensAfter(OPERA);
    const ply = 29; // 15.Bxd7+ (White, the student)
    const facets = computeMoveFacets({
      fenBefore: fens[ply - 2], fenAfter: fens[ply - 1], san: 'Bxd7+', ply,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 20, preMoveEval: 620, classification: 'inaccuracy', bestMoveSan: 'Qb8+',
      prevCap: { square: null, capturedValue: 0 }, allSans: OPERA, forcedRunStartPly: 29,
    });
    expect(facets.find((f) => f.startsWith('[quality]'))).toBeUndefined();
  });

  it('STILL grades a losing student move outside a forced mate (guard is scoped)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[18], fenAfter: fens[19], san: 'Nc6', ply: 20,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 20, preMoveEval: 300, classification: 'mistake', bestMoveSan: 'Nd7',
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    expect(facets.find((f) => f.startsWith('[quality]'))).toBeDefined();
  });

  it('every facet is bracket-tagged prose (the inventory shape)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[16], fenAfter: fens[17], san: 'Be6', ply: 18,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 150, preMoveEval: 150, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    for (const f of facets) expect(f).toMatch(/^\[[a-z-]+\]/);
  });
});

describe('computeThroughLine (David 2026-07-20 — through-line theme ledger)', () => {
  it('names the isolated-pawn story when the IQP runs through the middlegame', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const line = computeThroughLine(fens, 'w');
    expect(line).not.toBeNull();
    expect(line).toMatch(/isolated pawn/i);
  });

  it('returns null for a game with no recurring structural theme', () => {
    // A short symmetrical opening — no theme runs through it.
    const quiet = fensAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O', 'Nf6']);
    expect(computeThroughLine(quiet, 'w')).toBeNull();
  });

  it('returns null when the student color is unknown', () => {
    expect(computeThroughLine(fensAfter(SICILIAN_IQP), null)).toBeNull();
  });
});
