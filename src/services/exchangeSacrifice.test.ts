import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { exchangeSacrifice, exchangeSacrificeLine, exchangeSacIdea } from './exchangeSacrifice';
import { readBoard } from './boardComputers';

const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

// Every read below is Stockfish 16, depth 18, from the board before the move,
// White-POV centipawns; the move played was read with `searchmoves`.

// Danya, voiced note vc-6BHS8KMqLkU-48 (his White, move 24): "take with the
// rook, sacrificing the exchange to keep the light bishop as the main
// attacker — their king is caught in the crossfire." Rxf5 (485) against the
// engine's Bxf5 (557): a won board either way.
const RXF5 = 'rq5r/2pknp1n/8/p2p1pPp/1p1P4/3PB1PB/PP1Q4/1KR2R2 w - - 0 24';
const RXF5_READS = [
  { evaluation: 557, mate: null, moves: ['h3f5', 'd7e8', 'd2e2', 'b4b3', 'e3f4', 'a8a7', 'f4e5', 'e8f8'] },
  { evaluation: 485, mate: null, moves: ['f1f5', 'd7e8', 'e3f4', 'h7f8', 'f4c7', 'b8a7', 'f5f6', 'h5h4'] },
  { evaluation: 428, mate: null, moves: ['e3f4', 'b8b6', 'f4e5', 'h8g8', 'h3f5', 'e7f5', 'f1f5', 'd7e8'] },
];

// Danya, voiced note vc-cPVp5TWZR0w-34 (his Black, the Tartakower): "If White
// plays g3, you capture on e3." Rxe3 is the engine's best (−210).
const RXE3 = 'r3r1k1/ppb2pp1/1npq1pp1/8/2PP2B1/1P2B1PP/P4P2/R2Q1RK1 b - - 0 17';
const RXE3_READS = [
  { evaluation: -210, mate: null, moves: ['e8e3', 'd1d2', 'e3e4', 'c4c5', 'd6d4', 'd2d4', 'e4d4', 'c5b6'] },
  { evaluation: 11, mate: null, moves: ['b6d5', 'e3d2', 'd5e7', 'd2f4', 'd6d8', 'f4c7', 'd8c7', 'd1d2'] },
  { evaluation: 70, mate: null, moves: ['b6c8', 'f1e1', 'c8e7', 'h3h4', 'e7f5', 'g4f5', 'g6f5', 'd1f3'] },
];

// Danya, voiced note vc-gyOxMMJWiYg-37 (his White): "you could also put a
// rook on d6". Rd6 is the engine's best (729): Bxd6 exd6 leaves a passer.
const RD6 = '2kr3r/Qp1nbpp1/2p1p3/4P2p/4NP2/P6P/1PP3P1/2KR3R w - - 1 19';
const RD6_READS = [
  { evaluation: 707, mate: null, moves: ['c1b1', 'e7c5', 'e4d6', 'c5d6', 'e5d6', 'd7b8', 'd1d3', 'd8d7'] },
  { evaluation: 706, mate: null, moves: ['e4d6', 'e7d6', 'e5d6', 'd7b8', 'd1d3', 'd8d7', 'c1b1', 'h8d8'] },
  { evaluation: 729, mate: null, moves: ['d1d6', 'c8c7', 'h1d1', 'g7g6', 'd6d7', 'd8d7', 'd1d7', 'c7d7'] },
];

describe('exchangeSacrifice: the exchange given on purpose, and what it buys', () => {
  it('Rxf5: their knight on e7 beside their king is the piece the rook is given for', () => {
    const x = exchangeSacrifice(RXF5, 'Rxf5', RXF5_READS);
    expect(x).toMatchObject({ side: 'w', minor: 'n', square: 'f5', pawn: true, tookMinor: false, gain: { kind: 'shield' } });
    expect(x!.line).toEqual(['Rxf5', 'Nxf5', 'Bxf5+']);
    const line = exchangeSacrificeLine(x!, true, after(RXF5, 'Rxf5'));
    expect(line).toMatch(/exchange for a pawn/);
    expect(line).toMatch(/knight/);
    expect(line).toMatch(/their king/);
    expect(line).not.toMatch(/Rxf5/);
  });

  it('Rxe3, both seats: the pawn that takes back leaves the king thinner', () => {
    const x = exchangeSacrifice(RXE3, 'Rxe3', RXE3_READS);
    expect(x).toMatchObject({ side: 'b', minor: 'b', square: 'e3', tookMinor: true, retakeBy: 'p', gain: { kind: 'king-cover' } });
    const fa = after(RXE3, 'Rxe3');
    expect(exchangeSacrificeLine(x!, true, fa)).toMatch(/your rook for their bishop on e3.*Taking back with the pawn leaves their king one pawn fewer/);
    expect(exchangeSacrificeLine(x!, false, fa)).toMatch(/their rook for your bishop on e3.*leaves your king one pawn fewer.*They are down material/);
    expect(exchangeSacIdea(x!.key)).toBe('attack-king');
  });

  it('Rd6: the recapture makes a passed pawn', () => {
    const x = exchangeSacrifice(RD6, 'Rd6', RD6_READS);
    expect(x).toMatchObject({ side: 'w', minor: 'b', square: 'd6', gain: { kind: 'passer', square: 'd6' } });
    expect(exchangeSacrificeLine(x!, true, after(RD6, 'Rd6'))).toMatch(/passed pawn.*your pawn on d6/);
  });

  it('the engine has to vouch: Rc4 costs 1.4 (Danya vc-VkAqhxUJjrw-26), Rxf6 drops the game (vc-LJa5Df75CJI-27)', () => {
    // NEGATIVE CONTROLS on real boards: the exchange is lost the same way,
    // but the engine reads the move as worse than the best.
    expect(exchangeSacrifice('2rq1rk1/pp1bppbp/3p1np1/n7/3PP3/2NBBP2/PP1QN1PP/R4RK1 b - - 12 12', 'Rc4', [
      { evaluation: 64, mate: null, moves: ['a5c4', 'd3c4', 'c8c4', 'b2b3', 'c4c8', 'h2h3', 'a7a6', 'a2a4'] },
      { evaluation: 86, mate: null, moves: ['a7a6', 'b2b3', 'b7b5', 'a1c1', 'a5c6', 'h2h3', 'e7e6', 'd3b1'] },
      { evaluation: 204, mate: null, moves: ['c8c4', 'd3c4', 'a5c4', 'd2c1', 'c4e3', 'c1e3', 'b7b5', 'b2b4'] },
    ])).toBeNull();
    expect(exchangeSacrifice('rn3rk1/pp2qpp1/2pb1n1p/4p3/6b1/1BN4N/PPPP2KP/R1BQ1R2 w - - 1 13', 'Rxf6', [
      { evaluation: -408, mate: null, moves: ['d1e1', 'e5e4', 'h3g1', 'b8d7', 'e1h4', 'a7a5', 'a2a4', 'e7e5'] },
      { evaluation: -736, mate: null, moves: ['f1f6', 'g4d1', 'f6d6', 'e7d6', 'c3d1', 'd6g6', 'g2f1', 'b8d7'] },
    ])).toBeNull();
  });

  it('a line that wins the exchange back is a combination, not this (puzzle 01Pjd)', () => {
    // Lichess puzzle 01Pjd (crushing, endgame): …Rxg2+ Nxg2 Rxg2+ and the
    // rook on e1 falls — the material comes back.
    expect(exchangeSacrifice('6r1/1pp5/p2kp2R/3b1p2/3P1N2/P1P3rP/1P4PK/4R3 b - - 3 34', 'Rxg2+', [
      { evaluation: -575, mate: null, moves: ['g3g2', 'f4g2', 'g8g2', 'h2h1', 'g2e2', 'h1g1', 'e2e1', 'g1f2'] },
      { evaluation: 129, mate: null, moves: ['c7c5', 'e1e2', 'c5d4', 'c3d4', 'd5c4', 'e2e5', 'd6d7', 'a3a4'] },
    ])).toBeNull();
  });

  it('no read of the move, nothing said; a move that gives nothing is not this', () => {
    expect(exchangeSacrifice(RXF5, 'Rxf5', null)).toBeNull();
    expect(exchangeSacrifice(RXF5, 'Rxf5', [RXF5_READS[0]])).toBeNull();
    expect(exchangeSacrifice(RXF5, 'Bxf5', RXF5_READS)).toBeNull();
  });

  it('comes out of the one registry with the trade as its line', () => {
    const f = readBoard('exchangeSacrifice', { fenBefore: RXE3, san: 'Rxe3', student: 'b', reads: RXE3_READS });
    expect(f?.computer).toBe('exchangeSacrifice');
    expect(f?.seat).toBe('student');
    expect(f?.squares).toEqual(['e3']);
    const theirs = readBoard('exchangeSacrifice', { fenBefore: RXE3, san: 'Rxe3', student: 'w', reads: RXE3_READS });
    expect(theirs?.seat).toBe('opponent');
  });
});
