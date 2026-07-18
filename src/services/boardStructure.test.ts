import { describe, it, expect } from 'vitest';
import { describeStructure, structureSignature, structureMatchScore } from './boardStructure';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('boardStructure — pure structural facts (Phase 0)', () => {
  it('start position: no islands drama, no open files, no outposts, kings center', () => {
    const s = describeStructure(START)!;
    expect(s.pawns.islands).toEqual({ w: 1, b: 1 });
    expect(s.pawns.openFiles).toEqual([]);
    expect(s.pawns.passedPawns).toEqual({ w: [], b: [] });
    expect(s.outposts).toEqual([]);
    expect(s.kings.kingWing).toEqual({ w: 'center', b: 'center' });
    expect(s.kings.oppositeWings).toBe(false);
    expect(s.material.balance).toBe(0);
    expect(s.material.queensOn).toBe(true);
    expect(s.material.endgameType).toBeNull();
  });

  it('detects open and half-open files', () => {
    // White has no e-pawn; Black has no e- or d-pawn → e fully open, d half-open for Black...
    // Setup: remove White e2 and Black e7+d7.
    const fen = 'rnbqkbnr/ppp2ppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    const s = describeStructure(fen)!;
    expect(s.pawns.openFiles).toEqual(['e']);
    // d-file: White pawn present, Black pawn gone → half-open FOR Black.
    expect(s.pawns.halfOpenFiles.b).toContain('d');
    expect(s.pawns.halfOpenFiles.w).not.toContain('d');
  });

  it('detects a protected, unassailable knight outpost', () => {
    // White Nd5 protected by Pe4; Black has no c- or e-pawn → true outpost.
    const fen = 'r1bqkb1r/pp3ppp/2n2n2/3N4/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1';
    const s = describeStructure(fen)!;
    expect(s.outposts).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: 'w', piece: 'n', square: 'd5' })]),
    );
  });

  it('a "outpost" attackable by an enemy pawn is NOT an outpost', () => {
    // Same shape but Black still has the c7 pawn, which can advance to c6.
    const fen = 'r1bqkb1r/pppp1ppp/5n2/3N4/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1';
    const s = describeStructure(fen)!;
    expect(s.outposts.find((o) => o.square === 'd5')).toBeUndefined();
  });

  it('detects passed pawns', () => {
    // White pawn a5; Black has no a- or b-pawns → passed.
    const fen = '4k3/2pppppp/8/P7/8/8/1PPPPPPP/4K3 w - - 0 1';
    const s = describeStructure(fen)!;
    expect(s.pawns.passedPawns.w).toEqual(['a5']);
    expect(s.pawns.passedPawns.b).toEqual([]);
  });

  it('detects doubled and isolated pawns', () => {
    // White: pawns a2, a3 (doubled+isolated pair), d4 isolated.
    const fen = '4k3/8/8/8/3P4/P7/P7/4K3 w - - 0 1';
    const s = describeStructure(fen)!;
    expect(s.pawns.doubledFiles.w).toEqual(['a']);
    expect(s.pawns.isolatedPawns.w.sort()).toEqual(['a2', 'a3', 'd4']);
    expect(s.pawns.islands.w).toBe(2);
  });

  it('detects opposite-wing kings and shield pawns', () => {
    // White O-O (Kg1, pawns f2 g2 h2), Black O-O-O (Kc8, pawns a7 b7 c7).
    const fen = '2kr3r/pppq1ppp/2n2n2/4p3/4P3/2N2N2/PPPQ1PPP/3R1RK1 w - - 0 1';
    const s = describeStructure(fen)!;
    expect(s.kings.kingWing.w).toBe('kingside');
    expect(s.kings.kingWing.b).toBe('queenside');
    expect(s.kings.oppositeWings).toBe(true);
    expect(s.kings.shieldPawns.w).toBe(3);
    // Black's d7 is the QUEEN, not a pawn — the shield around Kc8 is b7+c7.
    expect(s.kings.shieldPawns.b).toBe(2);
  });

  it('classifies a rook endgame', () => {
    const fen = '4k3/1r3ppp/8/8/8/8/R4PPP/4K3 w - - 0 1';
    const s = describeStructure(fen)!;
    expect(s.material.endgameType).toBe('R+P');
    expect(s.material.queensOn).toBe(false);
  });

  it('returns null on an invalid FEN, never throws', () => {
    expect(describeStructure('not a fen')).toBeNull();
  });

  describe('structureSignature + matching (Phase 2 metric)', () => {
    it('the same position matches itself at 1.0', () => {
      const sig = structureSignature(START)!;
      expect(structureMatchScore(sig, sig)).toBe(1);
    });

    it('two outpost positions on the SAME square score higher than unrelated shapes', () => {
      const outpostA = structureSignature('r1bqkb1r/pp3ppp/2n2n2/3N4/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1')!;
      const outpostB = structureSignature('r2qkb1r/pp3ppp/2n1bn2/3N4/4P3/5N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1')!;
      const unrelated = structureSignature('4k3/1r3ppp/8/8/8/8/R4PPP/4K3 w - - 0 1')!;
      expect(structureMatchScore(outpostA, outpostB)).toBeGreaterThan(structureMatchScore(outpostA, unrelated));
      expect(structureMatchScore(outpostA, outpostB)).toBeGreaterThanOrEqual(0.6);
    });
  });
});
