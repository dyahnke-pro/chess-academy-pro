import { describe, it, expect } from 'vitest';
import { describeWhatMoveAllowed, gameReplyAfter } from './moveAllowed';

// Real cards from the hand walk 2026-10-01 (chess.com account "erik").
describe('describeWhatMoveAllowed — lead with what the move let them do', () => {
  it('a hung pawn: R2b3 lets Qxd6 take the loose d-pawn', () => {
    const fen = '1r4k1/p2b1p1p/3ppbp1/q7/4P3/P1PQ1NPP/1r3PB1/R1R3K1 b - - 2 23';
    expect(describeWhatMoveAllowed(fen, 'R2b3', 'Qxd6')).toBe('R2b3 lets them play Qxd6, winning your pawn on d6.');
  });

  it('a fork: Kh8 walks into Ng6+, the knight that card used to call pinned', () => {
    const fen = 'r5k1/1pp1p1rP/p2p4/4b1Q1/4pN2/2P1q2P/PP4P1/1R1R3K b - - 0 26';
    const s = describeWhatMoveAllowed(fen, 'Kh8', 'Ng6+');
    expect(s).toMatch(/^Kh8 lets them play Ng6\+, forking your king on h8 and your/);
  });

  it('mate: Rxh4 allows the mating line — said as mate, not points', () => {
    const fen = '8/2R5/5Kpk/1B3p1p/4p1rP/8/8/8 b - - 3 49';
    // after Rxh4 the engine line is Bc4 f4 Bg8 f3 Rh7#; Bc4 alone is quiet → silent
    expect(describeWhatMoveAllowed(fen, 'Rxh4', 'Bc4')).toBeNull();
  });

  it('silence when the reply proves nothing (a bare check or attack)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(describeWhatMoveAllowed(fen, 'e4', 'e5')).toBeNull();
    expect(describeWhatMoveAllowed(fen, 'e4', null)).toBeNull();
    expect(describeWhatMoveAllowed(fen, 'e5', 'e5')).toBeNull(); // illegal played move
  });

  it('every piece it names is the student\'s — never an owner-less "the queen"', () => {
    const fen = '1r4k1/p2b1p1p/3ppbp1/q7/4P3/P1PQ1NPP/1r3PB1/R1R3K1 b - - 2 23';
    const s = describeWhatMoveAllowed(fen, 'R2b3', 'Qxd6') ?? '';
    expect(s).not.toMatch(/\bthe (king|queen|rook|bishop|knight|pawn)\b/);
  });
});

describe('gameReplyAfter — what the opponent actually answered', () => {
  it('finds the reply after the played move in the PGN', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5';
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    expect(gameReplyAfter(pgn, fen, 'Nd4')).toBe('Nxe5');
    expect(gameReplyAfter(pgn, fen, 'Nf6')).toBeNull(); // the move at that position was not Nf6
  });
});
