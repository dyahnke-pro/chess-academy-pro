import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  secondWeakness, keyPawn, fixOnBishopColour, recaptureSealed, enPassantStructure, formation,
  breakTradesWeakPawn, dontRepair, mirroredAsymmetry,
} from './pawnJudgement';
import {
  restriction, pieceBlocksOwnPawn, semiOutpost, maskedWeakness, safeSquareRoute, fileEntryCovered,
  dontPlugFile, unmovedUnits, mutualRestriction, fileOpenedForDefender,
} from './squareJudgement';
import {
  rightIdeaWrongPiece, keepPlanChangeRoute, planOverOneMove, placementFutureLine, smallEdges, fightingLine,
} from './planJudgement';
import { studentMoveStructure, boardStructure, theirMoveStructure, linesStructure } from './structureReads';
import type { StructureRead } from './structureJudgementKit';

/** Every FEN used here is a legal chess.js position. */
const legal = (fen: string): string => { new Chess(fen); return fen; };
const fromSans = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

/** The voice rules every read must keep. */
function voiced(r: StructureRead | null): StructureRead {
  expect(r).not.toBeNull();
  const t = r!.text;
  expect(t).not.toMatch(/\b(we|our|us)\b/i);
  expect(t).not.toMatch(/\d+(\.\d+)?\s*%/);
  expect(t).not.toMatch(/\b\d+\.\s*[NBRQK]?[a-h]/); // no move numbers
  expect(r!.proof).toBeDefined();
  expect(r!.proof.short.length).toBeGreaterThan(0);
  return r!;
}

describe('pawnJudgement', () => {
  it('second weakness: their d5 holds, a6 is a second target on the other wing', () => {
    const fen = legal('3r2k1/5ppp/p4n2/3p4/5N2/8/PP3PPP/3R2K1 w - - 0 20');
    const r = voiced(secondWeakness(fen, 'w'));
    expect(r.text).toMatch(/d5/);
    expect(r.text).toMatch(/a6/);
    expect(r.proof.squares).toEqual(expect.arrayContaining(['d5', 'a6', 'f4', 'f6']));
    // Silent with only one weak pawn (the a-pawn backed by a b-pawn).
    expect(secondWeakness(legal('3r2k1/5ppp/pp3n2/3p4/5N2/8/PP3PPP/3R2K1 w - - 0 20'), 'w')).toBeNull();
  });

  it('key pawn: d5 guards e4; with d5 gone e4 falls', () => {
    const fen = legal('3q2k1/5ppp/8/3p4/4p3/2N3P1/PP3PBP/6K1 w - - 0 20');
    const r = voiced(keyPawn(fen, 'w'));
    expect(r.text).toBe('Their d5 pawn is the key pawn: it guards e4, and if d5 drops, e4 goes with it.');
    // Silent when a second pawn guards e4 (f5): d5 is not the only key.
    expect(keyPawn(legal('3q2k1/6pp/8/3p1p2/4p3/2N3P1/PP3PBP/6K1 w - - 0 20'), 'w')).toBeNull();
  });

  it('fix their pawns on your bishop\'s colour: a4 freezes a5 for the dark bishop', () => {
    const fen = legal('6k1/1b3ppp/8/p7/8/8/P4PPP/2B3K1 w - - 0 20');
    const r = voiced(fixOnBishopColour(fen, 'a4', 'w'));
    expect(r.text).toMatch(/^a4 freezes their a5 pawn on a dark square/);
    expect(r.text).toMatch(/no bishop of that colour/);
    // A light-squared bishop cannot use it: silent.
    expect(fixOnBishopColour(legal('6k1/1b3ppp/8/p7/8/8/P4PPP/3B2K1 w - - 0 20'), 'a4', 'w')).toBeNull();
  });

  it('their capture sealed your weakness: exd5 walls the backward d6 off the d-file', () => {
    const fen = legal('6k1/pp3ppp/3p4/3np3/2P1P3/8/PP3PPP/6K1 w - - 0 20');
    const r = voiced(recaptureSealed(fen, 'exd5', 'b'));
    expect(r.text).toMatch(/pawn on d5 walls your weak d6 pawn off the d-file/);
    // Their non-pawn capture seals nothing.
    expect(recaptureSealed(legal('6k1/pp3ppp/3p4/3np3/2P5/4N3/PP3PPP/6K1 w - - 0 20'), 'Nxd5', 'b')).toBeNull();
  });

  it('en passant as structure: declining keeps d3 and f3 shut; the engine wanting it silences it', () => {
    const fen = legal('rnbqkb1r/pppp1ppp/5n2/8/4pP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 3');
    const r = voiced(enPassantStructure(fen, 'd5', 'b', 0, 'd5'));
    expect(r.text).toBe('Not taking en passant keeps your e4 pawn where it is: it keeps d3 and f3 shut to their pieces.');
    expect(enPassantStructure(fen, 'd5', 'b', 0, 'exf3')).toBeNull();
    // Taking it when it cost gave the clamp up.
    const took = voiced(enPassantStructure(fen, 'exf3', 'b', 80, 'd5'));
    expect(took.text).toMatch(/gave up the clamp: your pawn on e4 kept d3 shut/);
  });

  it('formation: a3, b4 and c3 make a triangle', () => {
    const fen = legal('6k1/5ppp/8/8/8/P1P5/1P3PPP/6K1 w - - 0 20');
    const r = voiced(formation(fen, 'b4', 'w'));
    expect(r.text).toMatch(/^a3, b4 and c3 make a triangle: b4 is backed from both sides/);
    // A lone pawn push builds nothing.
    expect(formation(fen, 'h3', 'w')).toBeNull();
  });

  it('a break that trades off your weak pawn: d5 gets rid of the isolated d4', () => {
    const fen = legal('6k1/pp3ppp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 20');
    const r = voiced(breakTradesWeakPawn(fen, 'd5', 'w', 10));
    expect(r.text).toBe('d5 is the direct way to get rid of your weak d4 pawn: it meets their pawn on e6 and can be traded off.');
    expect(r.held?.tag).toBe('mistimed-pawn-break');
    // A healthy pawn's push is not this lesson.
    expect(breakTradesWeakPawn(legal('6k1/pp3ppp/4p3/8/2PP4/8/PP3PPP/6K1 w - - 0 20'), 'd5', 'w', 10)).toBeNull();
  });

  it('don\'t repair their structure: leave f6, it buries the g7 bishop', () => {
    const fen = legal('6k1/pp4bp/5pp1/3N4/8/8/PP4PP/5RK1 w - - 0 25');
    const r = voiced(dontRepair(fen, 'a3', 'w', 0, 'a3'));
    expect(r.text).toMatch(/Leaving their f6 pawn alone is right: it buries their own bishop on g7/);
    expect(r.held?.tag).toBe('greedy-pawn-grab');
    // The engine wanting the pawn silences it.
    expect(dontRepair(fen, 'a3', 'w', 0, 'Nxf6+')).toBeNull();
  });

  it('mirrored-square asymmetry: you can guard d4, they can never guard d5', () => {
    const fen = legal('6k1/pp3ppp/8/8/2p5/2P5/PP3PPP/6K1 w - - 0 20');
    const r = voiced(mirroredAsymmetry(fen, 'w'));
    expect(r.text).toBe('Your c-pawn can still guard d4; they can never guard d5 the same way, so that square stays a hole for them.');
    // The symmetric start: nothing to say.
    expect(mirroredAsymmetry(new Chess().fen(), 'w')).toBeNull();
  });
});

describe('squareJudgement', () => {
  it('restriction: c6-d5-e4 leave their g2 bishop staring at a wall', () => {
    const fen = legal('6k1/5ppp/2p5/3p4/4p3/6P1/PP3PBP/6K1 b - - 0 20');
    const r = voiced(restriction(fen, 'b'));
    expect(r.text).toBe('Your c6, d5 and e4 pawns leave their bishop on g2 staring at a wall: its long diagonal ends on e4.');
    // An unguarded pawn is no wall.
    expect(restriction(legal('6k1/5ppp/8/8/4p3/6P1/PP3PBP/6K1 b - - 0 20'), 'b')).toBeNull();
  });

  it('a piece in front of its own pawn: their c3 knight means nothing backs up d4', () => {
    const fen = legal('6k1/ppp2ppp/3p4/4p3/3PP3/2N5/PPP2PPP/6K1 b - - 0 12');
    const r = voiced(pieceBlocksOwnPawn(fen, 'b'));
    expect(r.text).toBe('Their knight on c3 sits in front of their own c2 pawn, so no pawn can ever come up to back up d4.');
    // An e3 pawn can still back it up: silent.
    expect(pieceBlocksOwnPawn(legal('6k1/ppp2ppp/3p4/4p3/3P4/2N1P3/PPP2PPP/6K1 b - - 0 12'), 'b')).toBeNull();
  });

  it('semi-outpost: d5 is a fine post until their e-pawn could one day reach e6', () => {
    const fen = legal('6k1/pp2p1pp/3p4/5P2/4P3/2N5/PP4PP/6K1 w - - 0 20');
    const r = voiced(semiOutpost(fen, 'Nd5', 'w', 0));
    expect(r.text).toBe('Their e-pawn could one day reach e6, but for now d5 is a fine post for your knight.');
    expect(r.held?.tag).toBe('misplaced-piece');
    // Without the f5 pawn the challenge is free: silent.
    expect(semiOutpost(legal('6k1/pp2p1pp/3p4/8/4P3/2N5/PP4PP/6K1 w - - 0 20'), 'Nd5', 'w', 0)).toBeNull();
  });

  it('masked weakness: the c6 knight hides their holes; b5 chases it', () => {
    const fen = legal('6k1/pp4pp/2n5/8/1P6/8/P4PPP/6K1 w - - 0 20');
    const r = voiced(maskedWeakness(fen, 'w'));
    expect(r.text).toMatch(/^Their weak d4 and e5 hide behind the knight on c6; chase it with b5/);
    // No pawn can chase it: silent.
    expect(maskedWeakness(legal('6k1/pp4pp/2n5/8/8/8/P4PPP/6K1 w - - 0 20'), 'w')).toBeNull();
  });

  it('a square valued for safety and route: the queen on a4, then b4', () => {
    const fen = legal('6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 30');
    const r = voiced(safeSquareRoute(fen, 'Qa4', 'w', ['d1a4', 'h7h6', 'a4b4'], 0));
    expect(r.text).toBe('Your queen on a4 is safe there, since nothing of theirs can hit it, and it can swing to b4 next.');
    expect(r.proof.line?.sans).toEqual(['Qa4', 'h6', 'Qb4']);
    // The engine's line moves something else next: silent.
    expect(safeSquareRoute(fen, 'Qa4', 'w', ['d1a4', 'h7h6', 'g1f1'], 0)).toBeNull();
  });

  it('file entry squares: let them open the c-file, c2, c3 and c4 are covered', () => {
    const fen = legal('2r3k1/pp3ppp/8/2p5/3P4/8/PP2BPPP/1N1Q2K1 w - - 0 20');
    const r = voiced(fileEntryCovered(fen, 'w'));
    expect(r.text).toBe('Let them open the c-file: every square their rooks could use there, c2, c3 and c4, is covered.');
    // Without the e2 bishop c4 is uncovered: silent.
    expect(fileEntryCovered(legal('2r3k1/pp3ppp/8/2p5/3P4/8/PP3PPP/1N1Q2K1 w - - 0 20'), 'w')).toBeNull();
  });

  it('don\'t plug your own open file: Bf4 blocks the f-rook; e5 keeps it open', () => {
    const fen = legal('6k1/pp3ppp/8/8/3PP3/8/PP4PP/2B2RK1 w - - 0 20');
    const r = voiced(dontPlugFile(fen, 'Bf4', 'w', 60, 'e5'));
    expect(r.text).toBe('Bf4 plugs your own rook\'s f-file; e5 keeps it open.');
    expect(r.stakes?.points).toBeCloseTo(0.6);
    // A move that cost nothing is not this lesson.
    expect(dontPlugFile(fen, 'Bf4', 'w', 10, 'e5')).toBeNull();
  });

  it('squares your unmoved pawns leave open: their knight reaches d4', () => {
    const fen = legal('r1bqkbnr/pppppppp/2n5/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 2');
    const r = voiced(unmovedUnits(fen, 'Nd4', 'w'));
    expect(r.text).toBe('Their knight reaches d4 because your c-pawn hasn\'t moved: on c3 it would cover that square.');
    // A knight landing where a pawn already covers it: silent.
    expect(unmovedUnits(legal('r1bqkbnr/pppppppp/2n5/8/8/2P2N2/PP1PPPPP/RNBQKB1R b KQkq - 0 2'), 'Nd4', 'w')).toBeNull();
  });

  it('mutual-restriction ledger: their h5 knight blocks your e2 bishop', () => {
    const fen = legal('6k1/6pp/5p2/7n/8/4P3/4BPPP/6K1 w - - 0 20');
    const r = voiced(mutualRestriction(fen, 'w'));
    expect(r.text).toBe('Their knight on h5 blocks your bishop on e2, a fair price: the knight is stuck on the rim.');
    // A free knight is not a stuck one.
    expect(mutualRestriction(legal('6k1/6pp/8/7n/8/8/4BPPP/6K1 w - - 0 20'), 'w')).toBeNull();
  });

  it('a file opened for the defender: after fxg3 their f1 rook owns the f-file', () => {
    const fen = legal('6k1/pp3ppp/8/7n/8/6B1/PP3PPP/5RK1 b - - 0 20');
    const r = voiced(fileOpenedForDefender(fen, 'Nxg3', 'b', 'fxg3', 40));
    expect(r.text).toBe('After their f-pawn takes back on g3, their rook on f1 owns the f-file.');
    expect(r.proof.line?.sans).toEqual(['Nxg3', 'fxg3']);
    // The h-pawn recapture opens nothing for the rook.
    expect(fileOpenedForDefender(fen, 'Nxg3', 'b', 'hxg3', 40)).toBeNull();
  });
});

describe('planJudgement', () => {
  it('right idea, wrong piece: d2 is right, but it is the b1 knight\'s job', () => {
    const fen = legal('6k1/ppp2ppp/2n5/4P3/8/5N2/PPP2PPP/1N4K1 w - - 0 20');
    const r = voiced(rightIdeaWrongPiece(fen, 'Nfd2', 'Nbd2', 100));
    expect(r.text).toBe('d2 is the right square, but it is the b1 knight\'s job: Nbd2. Your knight on f3 was guarding e5.');
    expect(rightIdeaWrongPiece(fen, 'Nfd2', 'Nbd2', 10)).toBeNull();
  });

  it('keep the plan, change the route: e4 runs into dxe4, g3 through f1', () => {
    const fen = legal('6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/6K1 w - - 0 20');
    const r = voiced(keepPlanChangeRoute(fen, 'Ne4', ['d2f1', 'a7a6', 'f1g3'], 300, 'dxe4'));
    expect(r.text).toBe('The knight jump to e4 runs into dxe4; that rules out the route, not the plan: it reaches g3 through f1 instead.');
    // A different piece in the engine's line: silent.
    expect(keepPlanChangeRoute(fen, 'Ne4', ['g1f1', 'a7a6', 'f1e1'], 300, 'dxe4')).toBeNull();
  });

  it('the plan over the one-move shot: the check is one move, Bf4 takes e5', () => {
    const fen = legal('4k3/pp3ppp/8/8/8/8/PP3PPP/2B1KB2 w - - 0 20');
    const r = voiced(planOverOneMove(fen, 'Bb5+', 'Bf4', 50));
    expect(r.text).toBe('The check is a one-move idea; Bf4 is the plan: it adds control of e5.');
    // A quiet move of the student's is no one-move shot.
    expect(planOverOneMove(fen, 'Be2', 'Bf4', 50)).toBeNull();
  });

  it('a placement judged by its future line: c4 and d5 open the b2 bishop', () => {
    const fen = legal('7k/pp3p1p/6p1/8/3P4/2P5/PB3PPP/6K1 w - - 0 20');
    const r = voiced(placementFutureLine(fen, 'w', ['c3c4', 'a7a6', 'd4d5']));
    expect(r.text).toBe('Your bishop on b2 looks dead, but your planned c4 and d5 open it.');
    // A line that never moves those pawns: silent.
    expect(placementFutureLine(fen, 'w', ['h2h3', 'a7a6', 'g1h2'])).toBeNull();
  });

  it('small edges accumulate — and stay quiet once one real mistake decides', () => {
    const r = voiced(smallEdges([
      { san: 'a3', cpLoss: 10 }, { san: 'Bd2', cpLoss: 40 }, { san: 'h3', cpLoss: 45 }, { san: 'Rb1', cpLoss: 70 },
    ]));
    expect(r.text).toBe('No single big mistake, but small ones piled up: Bd2, h3 and Rb1 each gave a little.');
    expect(smallEdges([{ san: 'Bd2', cpLoss: 40 }, { san: 'h3', cpLoss: 45 }, { san: 'Qxb7', cpLoss: 300 }, { san: 'Rb1', cpLoss: 70 }])).toBeNull();
  });

  it('fighting line or peaceful line: Bxc3 makes the imbalance, O-O keeps it quiet', () => {
    const fen = fromSans(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3']);
    const r = voiced(fightingLine(fen, 'b', [
      { moves: ['b4c3', 'b2c3'], evaluation: 20 },
      { moves: ['e8g8', 'f1d3'], evaluation: 30 },
    ]));
    expect(r.text).toBe('It\'s level, so make chances: Bxc3 creates the imbalance, bishop for knight and doubled pawns for them. O-O keeps it quiet.');
    // Not level: no "make chances" advice.
    expect(fightingLine(fen, 'b', [{ moves: ['b4c3', 'b2c3'], evaluation: 200 }, { moves: ['e8g8', 'f1d3'], evaluation: 210 }])).toBeNull();
  });
});

describe('structureReads — composed by when they apply', () => {
  it('the student move, their move, the board and the lines each reach their computers', () => {
    expect(studentMoveStructure({ fenBefore: legal('6k1/pp3ppp/8/8/3PP3/8/PP4PP/2B2RK1 w - - 0 20'), san: 'Bf4', student: 'w', cpLoss: 60, bestSan: 'e5', bestUci: ['e4e5'], reply: null }).map((r) => r.act)).toContain('dont-plug-file');
    expect(theirMoveStructure(legal('6k1/pp3ppp/3p4/3np3/2P1P3/8/PP3PPP/6K1 w - - 0 20'), 'exd5', 'b').map((r) => r.act)).toContain('recapture-sealed-weakness');
    expect(boardStructure(legal('3q2k1/5ppp/8/3p4/4p3/2N3P1/PP3PBP/6K1 w - - 0 20'), 'w').map((r) => r.act)).toContain('key-pawn');
    expect(linesStructure(fromSans(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3']), 'b', [
      { moves: ['b4c3', 'b2c3'], evaluation: 20 }, { moves: ['e8g8', 'f1d3'], evaluation: 30 },
    ]).map((r) => r.act)).toContain('fighting-line');
    // The opening position: no structural fact to state.
    expect(boardStructure(new Chess().fen(), 'w')).toEqual([]);
  });
});
