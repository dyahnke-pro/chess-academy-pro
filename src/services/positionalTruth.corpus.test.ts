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
    const cc = findColorComplexWeakness('2b3k1/pp3p1p/4p1p1/8/8/8/8/4K3 w - - 0 1');
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
    // White a2,b4 vs Black a7,b7,c6 → b5 hits c6 (Carlsbad archetype).
    const ma = findMinorityAttack('6k1/pp3ppp/2p1p3/8/1P6/4P3/P4PPP/6K1 w - - 0 1', 'w');
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
