/**
 * positionalTruth — adversarial corpus locking the POSITIONAL fact-computers to
 * their board-true definitions (David 2026-09-13, "strengthen the computers").
 *
 * The 2026-09-13 pin-aware sweep hardened the MATERIAL computers (SEE) and the
 * differential corpus (`computedMaterialTruth.corpus.test.ts`) locks them. This
 * is the same discipline for the POSITIONAL computers — piece quality (good/bad
 * bishop, knight outpost, rook files), weak squares (holes), passers + blockade.
 * An audit (same date) threw ~9 adversarial positions at them and found NO false
 * claims: they are classically defined and carefully gated. This corpus PINS
 * those definitions so a future refactor can't quietly reintroduce a known-bad
 * heuristic (e.g. the count-only "bad bishop" that once branded an active
 * developed bishop as bad, or a piece-based "hole").
 *
 * Every FEN + expectation verified against the board before baking (G3).
 */
import { describe, it, expect } from 'vitest';
import {
  findPieceQuality,
  findWeakSquares,
  findPassedPawns,
  findBlockade,
  findColorComplexWeakness,
  findMinorityAttack,
} from './positionReadingService';
import { readPosition } from './positionalRead';

describe('positionalTruth — knight outpost', () => {
  it('flags a pawn-defended knight no enemy pawn can challenge', () => {
    // Nd5 defended by c4+e4; Black has only a b-pawn, which can never hit d5.
    const q = findPieceQuality('4k3/1p6/8/3N4/2P1P3/8/8/4K3 w - - 0 1');
    expect(q.some((n) => n.square === 'd5' && n.piece === 'n' && n.quality === 'good')).toBe(true);
  });

  it('does NOT call an UNDEFENDED knight an outpost (a real outpost is pawn-held)', () => {
    // Nd5 with no pawn defending it — not an outpost.
    const q = findPieceQuality('3rk3/8/8/3N4/8/3b4/8/3RK3 w - - 0 1');
    expect(q.some((n) => n.square === 'd5' && n.reason === 'knight outpost')).toBe(false);
  });

  it('keeps the outpost when a bishop can trade it (a pawn recaptures, holding the square)', () => {
    // Bb7 attacks Nd5 but c4/e4 recapture — the outpost square survives the trade.
    const q = findPieceQuality('6k1/1b6/8/3N4/2P1P3/8/8/6K1 w - - 0 1');
    expect(q.some((n) => n.square === 'd5' && n.reason === 'knight outpost')).toBe(true);
  });
});

describe('positionalTruth — bad bishop is BLOCKED, not merely on-color', () => {
  it('does NOT brand a developed bishop with few on-color pawns as bad', () => {
    // Bg2 developed, but not ≥4 white pawns on its (light) colour AND not hemmed.
    const q = findPieceQuality('6k1/pp2b3/2p1p3/3pP3/3P4/2P5/PP4B1/6K1 w - - 0 1');
    expect(q.some((n) => n.piece === 'b' && n.quality === 'bad')).toBe(false);
  });

  it('does NOT flag a home (undeveloped) bishop as bad', () => {
    const q = findPieceQuality('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(q.some((n) => n.piece === 'b' && n.quality === 'bad')).toBe(false);
  });
});

describe('positionalTruth — weak squares are pawn-holes, not piece-guarded squares', () => {
  it('a hole is a square no PAWN of that side can ever guard', () => {
    // Black has only a b-pawn → no black pawn can ever guard d5 → d5 is a BLACK
    // hole. (That is exactly why White's knight outposts there — a strong square
    // for White IS a hole in Black's camp.) White's own c4/e4 pawns guard d5, so
    // it is NOT a white hole.
    const holes = findWeakSquares('4k3/1p6/8/3N4/2P1P3/8/8/4K3 w - - 0 1');
    expect(holes.black).toContain('d5');
    expect(holes.white).not.toContain('d5');
  });

  it('a square a friendly pawn still controls is NOT a hole', () => {
    // A white pawn on e4 guards d5 and f5, so neither is a white hole.
    const w = findWeakSquares('4k3/8/8/8/4P3/8/8/4K3 w - - 0 1').white;
    expect(w).not.toContain('d5'); // e4 guards d5
    expect(w).not.toContain('f5'); // e4 guards f5
  });
});

describe('positionalTruth — rook on the seventh (2026-09-13 add)', () => {
  it('flags a rook on the relative 7th that bites on enemy pawns', () => {
    const q = findPieceQuality('6k1/3R1ppp/8/8/8/8/5PPP/6K1 w - - 0 1');
    expect(q.some((n) => n.square === 'd7' && n.reason === 'rook on the seventh rank')).toBe(true);
  });
  it('does NOT praise a rook on the 7th that simply hangs', () => {
    // Bc8 attacks d7 — the rook is not safe there.
    const q = findPieceQuality('2b3k1/3R2pp/8/8/8/8/6PP/6K1 w - - 0 1');
    expect(q.some((n) => n.reason === 'rook on the seventh rank')).toBe(false);
  });
});

describe('positionalTruth — weak colour complex (2026-09-13 add)', () => {
  it('fires when the bishop of that colour is gone and ≥2 own-camp holes are that colour', () => {
    // Black has a light bishop (c8) but NO dark bishop; d6/f6/h6 are dark holes
    // in Black's camp → a dark-square complex weakness for Black.
    // White's knight on e4 — the piece that can settle on those holes, one
    // step from d6 and f6 (a hole nothing of theirs can reach is not a
    // weakness: hand walk 2026-09-27; Danya article boards 2026-11-18).
    const cc = findColorComplexWeakness('2b3k1/pp3p1p/4p1p1/8/4N3/8/8/4K3 w - - 0 1');
    expect(cc.some((c) => c.side === 'b' && c.complex === 'dark' && c.squares.includes('d6'))).toBe(true);
  });
  it('does NOT fire when a bishop of that colour still covers the squares', () => {
    // Black keeps its dark bishop on g7 → no dark-complex weakness.
    const cc = findColorComplexWeakness('2b2bk1/pp3p1p/4p1p1/8/8/8/8/4K3 w - - 0 1');
    expect(cc.some((c) => c.side === 'b' && c.complex === 'dark')).toBe(false);
  });
});

describe('positionalTruth — minority attack (2026-09-13 add)', () => {
  it('names the lever + target when a real minority is ready to strike', () => {
    // White a4,b4 vs Black a7,b7,c6 → b5 hits c6 (Carlsbad archetype): a4
    // holds b5, b7 takes back, and c6 is left backward on the half-open
    // c-file. (With the pawn still on a2, …cxb5 simply wins it.)
    const ma = findMinorityAttack('6k1/pp3ppp/2p1p3/8/PP6/4P3/5PPP/6K1 w - - 0 1', 'w');
    expect(ma).toEqual({ flank: 'queenside', leverSan: 'b5', leverFrom: 'b4', leverTo: 'b5', target: 'c6' });
  });
  it('does NOT fire without a pawn minority on the flank', () => {
    // Equal pawns on the queenside → no minority attack.
    expect(findMinorityAttack('6k1/pp3ppp/4p3/8/1P6/4P3/P4PPP/6K1 w - - 0 1', 'w')).toBeNull();
  });
});

describe('positionalTruth — passers and blockade', () => {
  it('a pawn with no enemy pawn to stop it is passed', () => {
    expect(findPassedPawns('4k3/1p6/8/8/4P3/8/8/4K3 w - - 0 1', 'w')).toContain('e4');
  });

  it('detects a knight/bishop blockading the enemy passer (from the blockader’s side)', () => {
    // White pawn d5 passed; Black Nd6 sits in front — black blockades it.
    const fen = '6k1/8/3n4/3P4/8/8/6PP/6K1 w - - 0 1';
    expect(findPassedPawns(fen, 'w')).toContain('d5');
    expect(findBlockade(fen, 'b')).toEqual({ blocker: 'd6', pawn: 'd5' });
    // and white is not "blockading" anything of black's here
    expect(findBlockade(fen, 'w')).toBeNull();
  });
});

// Danya article boards 2026-11-18: "isolated — a long-term target" / "so a
// piece has to" said for a pawn nothing of the other side could reach.
describe('positionalTruth — an isolated pawn is a target only when it can be reached', () => {
  it('silent for a far pawn nothing of theirs reaches in a move (a7, their bishop on the other colour)', () => {
    const said = readPosition('8/p7/5p1p/6p1/1PK3P1/kBp2P1P/2P5/1n6 b - - 0 54', 'black').map((o) => o.text).join(' ');
    expect(said).not.toMatch(/a7 is isolated/);
  });
  it('in an ending the king is an attacker: b6 with their king a step away', () => {
    const said = readPosition('8/8/1p1k4/5ppp/PPK1p3/6P1/5PP1/8 b - - 0 40', 'black').map((o) => o.text).join(' ');
    expect(said).toMatch(/b6 is isolated/);
  });
  it('still said when a piece of theirs bears on it: White\'s a3, hit by the knight on c4', () => {
    const said = readPosition('2r2rk1/p2qbppp/4p3/3pP1N1/2nP3P/P2R4/5PP1/2BQR1K1 b - - 0 20', 'black').map((o) => o.text).join(' ');
    expect(said).toMatch(/Their pawn on a3 is isolated/);
  });
});
