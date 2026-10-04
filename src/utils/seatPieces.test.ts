import { describe, it, expect } from 'vitest';
import { seatBare, seatPieceReferences } from './seatPieces';

// Naroditsky's game after 22.Nc3 Rd8 (hand walk 2026-09-24), student White.
const FEN = '2kr4/1r3ppp/Rn1q2b1/1Ppp4/6P1/2NP3P/2P2PB1/Q4RK1 w - - 5 23';

describe('seatBare', () => {
  it('owns each piece from the board and REPLACES "the" (never "the their")', () => {
    expect(seatBare('Moving the knight on b6 would unveil the rook on a6 against the queen on d6', FEN, 'w'))
      .toBe('Moving their knight on b6 would unveil your rook on a6 against their queen on d6');
  });
  it('seats a bare description and capitalises the first word', () => {
    expect(seatBare('rook on a6 pins knight on b6 against queen on d6', FEN, 'w'))
      .toBe('Your rook on a6 pins their knight on b6 against their queen on d6');
  });
  it('leaves an already-owned piece alone', () => {
    expect(seatBare('your rook on a6 is active', FEN, 'w')).toBe('Your rook on a6 is active');
  });
});

describe('a future fact is seated on its OWN board (hand walk 2026-09-24)', () => {
  const s = 'Rook on d8 skewers queen on e8 with rook on f8 behind it';
  it('on the board after Rxd8 the d8 rook is yours', () => {
    expect(seatBare(s, '3Rqrk1/pp4pp/2p1n3/4Pp1n/1b4P1/1BN1BR1P/PPP5/4Q1K1 b - - 0 21', 'w')).toMatch(/^Your rook on d8/);
  });
  it('NEGATIVE CONTROL: seated on the current board it is (wrongly) theirs — why boardFen exists', () => {
    expect(seatBare(s, '3rqrk1/pp4pp/2p1n3/4Pp1n/1b4P1/1BN1BR1P/PPP5/3RQ1K1 w - f6 0 21', 'w')).toMatch(/^Their rook on d8/);
  });
});

describe('a colour possessive is replaced, never stacked (hand walk 2340)', () => {
  it('"White\'s king on g1" → "Your king on g1"; "Knight on g3 forks…" is seated', () => {
    const fen = '4r1k1/5ppp/8/8/8/6n1/5PPP/3R1RK1 w - - 0 20';
    expect(seatBare("White's king on g1 has no escape square", fen, 'w')).toBe('Your king on g1 has no escape square');
    expect(seatBare('Knight on g3 forks rook on f1 and king on g1', fen, 'b')).toBe('Your knight on g3 forks their rook on f1 and their king on g1');
  });
});

describe('"their own" / "your own" is already seated (corpus sweep 2026-10-02)', () => {
  it('never stamps a second owner after "own"', () => {
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    expect(seatPieceReferences('Their …d6 shuts in their own bishop on f8.', fen, 'w'))
      .toBe('Their …d6 shuts in their own bishop on f8.');
    expect(seatPieceReferences('That blocks your own knight on g1.', fen, 'w'))
      .toBe('That blocks your own knight on g1.');
  });
});

describe('a replaced demonstrative keeps its case', () => {
  // Review walk oct3g, game 2 ply 11: the beat opened "your queen on d3 takes
  // the bishop's retreat" — lowercase at the start of the spoken line.
  const QD3 = 'r1bqkbnr/1p1p1ppp/p3p3/2p1P3/2Bn4/1P1Q4/P1PP1PPP/RNB1K1NR b KQkq - 2 6';
  it('capitalises the possessive that replaces a sentence-opening "That"', () => {
    expect(seatPieceReferences("That queen on d3 takes the bishop's retreat.", QD3, 'w'))
      .toBe("Your queen on d3 takes the bishop's retreat.");
  });
  it('keeps a mid-sentence "that" lowercase', () => {
    expect(seatPieceReferences('Watch that knight on d4.', QD3, 'w')).toBe('Watch their knight on d4.');
  });
});

// Review walk 2026-10-04, G3 (lichess mZ1GOTOw) 15.bxa5: "their pawn structure
// splinters — a new their isolated pawn on a5".
describe('a determiner a word or two back heads the phrase', () => {
  it('"a new isolated pawn on a5" gets no possessive stamped inside it', () => {
    const fen = 'r2k3r/ppp1npp1/2p4p/P3P3/2b1N3/P4N2/5PPP/R1B2RK1 b - - 0 15';
    const out = seatPieceReferences('their pawn structure splinters — a new isolated pawn on a5', fen, 'b');
    expect(out).not.toMatch(/a new their/);
  });
});
