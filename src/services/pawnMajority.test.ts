import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pawnMajority, pawnMajorityLine, pawnMajoritySquares, wingMajorities, majorityIdea } from './pawnMajority';
import { readBoard } from './boardComputers';
import { structureSignature } from './boardStructure';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

// Danya, voiced note vc-OQsa_sdKzjY-10 (his Black, the Alekhine Exchange):
// "You recapture with the c-pawn on d6 … White gets a queenside pawn majority,
// you get a kingside majority."
const ALEKHINE = {
  prior: { fenBefore: 'rnbqkb1r/ppp1pppp/1n1p4/4P3/2PP4/8/PP3PPP/RNBQKBNR w KQkq - 0 5', san: 'exd6' },
  fenBefore: 'rnbqkb1r/ppp1pppp/1n1P4/8/2PP4/8/PP3PPP/RNBQKBNR b KQkq - 0 5',
};
// Danya, voiced note vc-cPVp5TWZR0w-10 (his Black, the Caro-Kann Tartakower):
// "you recapture with the e-pawn" — 5…exf6 doubles the f-pawns.
const CARO = {
  prior: { fenBefore: 'rnbqkb1r/pp2pppp/2p2n2/8/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 1 5', san: 'Nxf6+' },
  fenBefore: 'rnbqkb1r/pp2pppp/2p2N2/8/3P4/8/PPP2PPP/R1BQKBNR b KQkq - 0 5',
};
// Danya, voiced note vc-EPS51oKRgpU-53 (his White): "kingside pawn majority
// you could push with g4 — let's go for it."
const G4 = {
  prior: { fenBefore: '1r5r/1p1npkb1/p2pN3/P1pP1P1p/2P2P2/1R1RB2P/1P4P1/6K1 b - - 2 26', san: 'Bf6' },
  fenBefore: '1r5r/1p1npk2/p2pNb2/P1pP1P1p/2P2P2/1R1RB2P/1P4P1/6K1 w - - 3 27',
};
// Danya, voiced note vc-VeHyQWutHPQ-62 (his White): …Qxd4 exd4, "you
// recapture with the pawn" — the e-pawn leaves the kingside.
const EXD4 = {
  prior: { fenBefore: '2r3k1/4bp2/6p1/p2p3p/2qQ4/2P1P1PP/5P1K/8 b - - 1 30', san: 'Qxd4' },
  fenBefore: '2r3k1/4bp2/6p1/p2p3p/3q4/2P1P1PP/5P1K/8 w - - 0 31',
};

describe('pawnMajority: the wing majority made, crippled, given up, set moving', () => {
  it('the one wing read feeds the structure signature too', () => {
    expect(structureSignature(after(ALEKHINE.fenBefore, 'cxd6'))?.queensideMajority).toBe('w');
  });

  it('Alekhine …cxd6: the trade splits the wings, both seats', () => {
    const x = pawnMajority(ALEKHINE.fenBefore, 'cxd6', ALEKHINE.prior);
    expect(x).toMatchObject({ event: 'created', majority: { side: 'b', wing: 'kingside', count: 4, against: 3, healthy: true, lead: 'e7' }, split: { side: 'w', wing: 'queenside', lead: 'c4' } });
    const fa = after(ALEKHINE.fenBefore, 'cxd6');
    expect(pawnMajorityLine(x!, 'b', fa)).toBe('That trade splits the pawns: you get a kingside majority, four pawns against three, and they get one on the queenside. Each can make a passed pawn: yours with the pawn on e7, theirs with the pawn on c4.');
    expect(pawnMajorityLine(x!, 'w', fa)).toMatch(/^That trade splits the pawns: they get a kingside majority, four pawns against three, and you get one on the queenside\. Each can make a passed pawn: theirs with the pawn on e7, yours with the pawn on c4\.$/);
    expect(pawnMajoritySquares(x!)).toEqual(['e7', 'c4']);
    expect(majorityIdea(x!.key)).toBe('passed-pawn');
  });

  it('…exf6 in the Caro-Kann: the kingside majority is doubled and cannot make a passed pawn', () => {
    const x = pawnMajority(CARO.fenBefore, 'exf6', CARO.prior);
    expect(x).toMatchObject({ event: 'crippled', majority: { side: 'b', wing: 'kingside', healthy: false, doubled: ['f'] } });
    expect(pawnMajorityLine(x!, 'b', after(CARO.fenBefore, 'exf6'))).toBe('That leaves your pawns doubled on the f-file, so your kingside majority can no longer make a passed pawn.');
  });

  it('g4: the kingside majority set moving, its lead on f5', () => {
    const x = pawnMajority(G4.fenBefore, 'g4', G4.prior);
    expect(x).toMatchObject({ event: 'advance', majority: { side: 'w', wing: 'kingside', count: 4, against: 2, lead: 'f5' } });
    expect(pawnMajorityLine(x!, 'w', after(G4.fenBefore, 'g4'))).toMatch(/kingside majority.*four pawns against two.*your pawn on f5/);
  });

  it('…Qxd4 exd4: taking back with the e-pawn gives up the kingside majority', () => {
    const x = pawnMajority(EXD4.fenBefore, 'exd4', EXD4.prior);
    expect(x).toMatchObject({ event: 'gave-up', majority: { side: 'w', wing: 'kingside' }, now: { count: 3, against: 3 } });
    expect(pawnMajorityLine(x!, 'w', after(EXD4.fenBefore, 'exd4'))).toMatch(/your kingside majority.*three pawns against three/);
    expect(pawnMajorityLine(x!, 'b', after(EXD4.fenBefore, 'exd4'))).toMatch(/their kingside majority/);
  });

  it('NEGATIVE: a trade in flight and a level open Sicilian say nothing', () => {
    // The open Sicilian (openings-lichess.json, B54): …cxd4 is answered by
    // Nxd4, so the board after …cxd4 is not the game's; after Nxd4 the wings
    // are level (three against three, four against four).
    const c = new Chess();
    for (const s of ['e4', 'c5', 'Nf3', 'd6', 'd4']) c.move(s);
    const beforeCxd4 = c.fen();
    expect(pawnMajority(beforeCxd4, 'cxd4', { fenBefore: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', san: 'd4' })).toBeNull();
    c.move('cxd4');
    expect(pawnMajority(c.fen(), 'Nxd4', { fenBefore: beforeCxd4, san: 'cxd4' })).toBeNull();
    c.move('Nxd4');
    expect(wingMajorities(c.fen())).toEqual([]);
    // A recapture read with no move before it cannot know where the trade began.
    expect(pawnMajority(ALEKHINE.fenBefore, 'cxd6', null)).toBeNull();
  });

  it('comes out of the one registry', () => {
    const f = readBoard('pawnMajority', { fenBefore: ALEKHINE.fenBefore, san: 'cxd6', student: 'b', prior: ALEKHINE.prior });
    expect(f?.computer).toBe('pawnMajority');
    expect(f?.seat).toBe('student');
    expect(f?.squares).toEqual(['e7', 'c4']);
  });
});
