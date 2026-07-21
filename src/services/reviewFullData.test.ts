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
