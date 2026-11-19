import { describe, it, expect } from 'vitest';
import { readPosition, theirBishopPair } from './positionalRead';

// Danya's article boards (2026-11-18): the opponent held the bishop pair and
// the read never said it — "White's two bishops are the long-term danger".
const pairOf = (fen: string, student: 'white' | 'black'): ReturnType<typeof readPosition>[number] | undefined => readPosition(fen, student).find((o) => o.kind === 'pair');

describe('positionalRead — their bishop pair', () => {
  it('the anatomy of a brilliancy #2: White has the pair, Black to move', () => {
    const o = pairOf('r4rk1/p3pp1p/b1p3p1/3nq3/8/6P1/P2BPPBP/2RQR1K1 b - - 0 17', 'black');
    expect(o?.side).toBe('opponent');
    expect(o?.text).toMatch(/knight and bishop/);
    expect([...(o?.squares ?? [])].sort()).toEqual(['d2', 'g2']);
  });
  it('the two-knight advantage #1: two bishops against two knights', () => {
    expect(pairOf('r2q1rk1/ppp2ppp/2n1pn2/8/2QP1B2/2P1PP1P/P4P2/2KR1B1R b - - 0 13', 'black')?.text).toMatch(/two knights/);
  });
  it('weak squares, who cares #3: Black has the pair, White to move', () => {
    expect(pairOf('r1bq1rk1/1pp3pp/p1pb1p2/8/3NPP2/3QB3/PPP3PP/R4RK1 w - - 0 14', 'white')).toBeTruthy();
  });
  it('quiet when the pair is the student\'s own (the plan says it)', () => {
    expect(pairOf('2kr3r/1b1nqpn1/1p1p2p1/p1pPp2p/P1P1P2P/1NPBBPP1/3Q4/2KR3R w - - 0 20', 'white')).toBeUndefined();
  });
  it('quiet when both sides keep two bishops, or the two are on one colour', () => {
    expect(pairOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white')).toBeUndefined();
    // Two light-squared bishops (c4 and d1, one promoted): no pair.
    expect(theirBishopPair('4k3/8/8/8/2B5/8/8/3BK1n1 w - - 0 1', 'w')).toBeNull();
    // b4 and d1: one of each colour, a pair.
    expect(theirBishopPair('4k3/8/8/8/1B6/8/8/3BK1n1 w - - 0 1', 'w')).not.toBeNull();
  });
});

describe('positionalRead — every weak pawn, never the first', () => {
  it('the positional rook lift #1: the doubled pawn a piece is tied to, both files keyed', () => {
    const o = readPosition('r3k2r/1p3pbp/p2pq1p1/4p1P1/4P1P1/1PP5/1P3P2/R1BQK2R w KQkq - 0 18', 'white')
      .find((x) => x.key.startsWith('student-doubled-'));
    expect(o?.text).toBe('Your pawns on the b-file are doubled, so no pawn can guard the one on b3. Only your queen on d1 does, and it is tied to it.');
    expect(o?.aliases).toContain('student-doubled-g');
  });
  it('one doubled file is still said as one', () => {
    const o = readPosition('r3r1k1/1pq2ppp/pnp2n2/5P2/5b2/1BN4P/PPQ2PP1/R1BR3K w - - 0 18', 'white')
      .find((x) => x.key.startsWith('student-doubled-'));
    expect(o?.text).toMatch(/on the f-file are doubled/);
  });
  // Danya, how to ruin your pawn structure #1: Black's doubled f-pawns "are
  // defended by the e7 bishop and do not matter" — never called targets.
  it('their guarded doubled pawns are not called targets', () => {
    const obs = readPosition('1r2k2r/4bp2/p2pbp2/1p2p2p/4P1P1/P3BP2/1PPR3P/1K3B1R w k - 0 18', 'white');
    expect(obs.find((x) => x.key.startsWith('opponent-doubled-'))).toBeUndefined();
    expect(obs.map((o) => o.text).join(' ')).not.toMatch(/makes them targets/);
  });
  it('their loose doubled pawn the student can reach is named (negative control)', () => {
    // f6 has no guard; the rook on f1 hits it down the file.
    const o = readPosition('6k1/5p2/5p2/8/8/8/6PP/5RK1 w - - 0 30', 'white').find((x) => x.key.startsWith('opponent-doubled-'));
    expect(o?.text).toBe('Their pawns on the f-file are doubled, and nothing guards the one on f6 — aim a piece at it.');
  });
});

describe('positionalRead — a stranded minor (Danya, the positional rook lift #2)', () => {
  it('White\'s bishop on h6: g7, f8 and g5 all covered', () => {
    const o = readPosition('2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25', 'black')
      .find((x) => x.key === 'opponent-stranded-b');
    expect(o?.text).toBe('Their bishop on h6 is stranded: every square it can go to is covered, so it has no safe square — attack it and it has nowhere to go.');
    expect([...(o?.squares ?? [])]).toEqual(['h6', 'f8', 'g5', 'g7']);
  });
  it('a knight on a fifth-rank post is not stranded, nor a piece at home', () => {
    const post = readPosition('r3r1k1/pppq1ppn/3p3p/3PpN2/4PnPP/4QPN1/PPP5/2KR3R w - - 0 19', 'white');
    expect(post.some((x) => x.key.endsWith('-stranded-n'))).toBe(false);
    expect(readPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white').some((x) => x.key.includes('stranded'))).toBe(false);
  });
});

describe('positionalRead — their king stuck in the centre (Danya, the knockout blow #2)', () => {
  it('Black\'s king on d7, no castling, queens on', () => {
    const o = readPosition('3rr3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w - - 0 19', 'white')
      .find((x) => x.key === 'opponent-king-centre');
    expect(o?.text).toMatch(/^Their king on d7 is stuck in the centre/);
  });
  it('a king on d7 that still has a castling right is not stuck', () => {
    expect(readPosition('r3r3/pp1k2pp/2n1p3/3p1q2/8/1P3NP1/1PP1QPP1/3RR1K1 w q - 0 19', 'white').some((x) => x.key === 'opponent-king-centre' && /stuck/.test(x.text))).toBe(false);
  });
});
describe('positionalRead — a king on d7 with the queens off is an endgame king', () => {
  it('no queens: no centre warning', () => {
    expect(readPosition('3rr3/pp1k2pp/2n1p3/3p4/8/1P3NP1/1PP2PP1/3RR1K1 w - - 0 19', 'white').some((x) => x.key === 'opponent-king-centre')).toBe(false);
  });
});
describe('positionalRead — two covered squares are "both"', () => {
  it('the discovered check reloaded #1: Bh6 with f8 and g7 covered', () => {
    const o = readPosition('3rr1k1/1bqnbp1p/ppp1p1pB/6N1/3P3Q/3B4/PPP2PPP/3RR1K1 w - - 0 18', 'white').find((x) => x.key === 'student-stranded-b');
    expect(o?.text).toMatch(/f8 and g7 are both covered/);
  });
});

describe('positionalRead — three isolated pawns are counted, not listed', () => {
  it('how to survive a chess disaster #4: three of theirs', () => {
    const o = readPosition('2R5/7p/1p2Nq1k/rb6/5p2/6P1/5bBP/2Q4K w - - 0 36', 'white').find((x) => x.key.startsWith('opponent-iso-'));
    expect(o?.text).toBe('They have three isolated pawns — long-term targets worth playing against.');
    expect(o?.squares?.length).toBe(3);
  });
});

describe('positionalRead — the best-placed piece is the one doing the most', () => {
  const best = (fen: string, student: 'white' | 'black', side: 'student' | 'opponent' = 'student'): string | undefined =>
    readPosition(fen, student).find((o) => o.side === side && o.kind === 'piece' && /well placed|best-placed/.test(o.text))?.text;
  it('weak squares, who cares #5: their knight entrenched on e5, not the rook behind it', () => {
    expect(best('r3rq2/1b3pbk/p2p2p1/1pnPn1Bp/P1p1PR2/2P3NP/1PBQ2PN/5RK1 w - - 0 27', 'white', 'opponent')).toMatch(/Their knight on e5 is well placed/);
  });
  it('a good piece is said with its work: the rook pressing a pawn over the rook on an empty file', () => {
    // Queen, the supporting actress #2: the h1 rook's open h-file reaches
    // nothing; the d1 rook presses their pawn on d5.
    expect(best('r1br1knQ/2q2pp1/p2bp3/1p1pn3/5B2/1NN2P2/PPP5/2KR1B1R w - - 0 23', 'white')).toMatch(/rook on d1 .*presses down the d-file on their pawn on d5/);
  });
  it('quiet when no piece of the side is well placed (the opening position)', () => {
    expect(best('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white')).toBeUndefined();
  });
});

describe('positionalRead — their knight heading for a hole is not kept bad', () => {
  it('weak squares who cares #0: no "keeping it bad" for the h4 knight', () => {
    const obs = readPosition('r1bq1rk1/pp6/n2p1p1b/2pPp2p/2P1P1nN/P1N3B1/1P2BPP1/R2Q1RK1 b - - 0 18', 'black');
    expect(obs.map((o) => o.text).join(' ')).not.toMatch(/knight on h4 is their problem piece/);
  });
});

describe('a bishop behind an advanced wedge is no problem piece (the positional sacrifice #2: "the monstruous bishop on e4")', () => {
  it('the e4 bishop behind d5 and f5 is not called a problem piece', () => {
    const r = readPosition('1rb5/r2k1pp1/p2p3p/P2PpP2/1NP1BbPP/8/4K3/1R5R w - - 0 31', 'white');
    expect(r.some((o) => /problem piece/.test(o.text) && /bishop/.test(o.text))).toBe(false);
  });
  it('negative control: a bishop hemmed in at home by its own pawns still is (the art of maneuvering #0)', () => {
    const r = readPosition('4rr2/pb1qnpbk/1p1p2pp/2p1n3/4PNP1/P1NPB2P/1PP1QRB1/5R1K w - - 0 21', 'white');
    expect(r.some((o) => /problem piece/.test(o.text) && /bishop/.test(o.text))).toBe(true);
  });
});
