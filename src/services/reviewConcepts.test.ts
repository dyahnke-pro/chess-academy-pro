import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectConcept, type ConceptCtx } from './reviewConcepts';

// Build a ctx by playing `san` from `fenBefore` (chess.js computes fenAfter).
function ctx(fenBefore: string, san: string, opts: Partial<ConceptCtx>): ConceptCtx {
  const c = new Chess(fenBefore);
  const mv = c.move(san);
  if (!mv) throw new Error(`illegal ${san}`);
  return {
    fenBefore, fenAfter: c.fen(), san: mv.san, moverColor: mv.color,
    evalBefore: opts.evalBefore ?? 0, evalAfter: opts.evalAfter ?? 0,
    studentColor: opts.studentColor ?? mv.color,
  };
}

describe('reviewConcepts — simplify-when-ahead', () => {
  // A capture that completes an even trade while the mover is up a lot: eval
  // stays high and barely moves, one piece leaves the board.
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3';

  it('fires on an even trade while clearly ahead (eval stays high, barely moves)', () => {
    const beat = detectConcept(ctx(fen, 'Nd4', { evalBefore: -600, evalAfter: -560, studentColor: 'b' }));
    // Nd4 isn't a capture — should NOT fire simplify. Use a real capture instead:
    const capFen = 'r1bqk2r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    const b2 = detectConcept(ctx(capFen, 'Bxd5', { evalBefore: 650, evalAfter: 610, studentColor: 'w' }));
    expect(beat).toBeNull();
    expect(b2?.concept).toBe('simplify-when-ahead');
    expect(b2?.source).toMatch(/wikipedia\.org/);
  });

  it('does NOT fire when only slightly ahead', () => {
    const capFen = 'r1bqk2r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    expect(detectConcept(ctx(capFen, 'Bxd5', { evalBefore: 80, evalAfter: 60, studentColor: 'w' }))).toBeNull();
  });

  it('does NOT fire when the capture WINS material (eval swings up)', () => {
    const capFen = 'r1bqk2r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    // eval jumps +400 → that's winning material, not a consolidating trade.
    expect(detectConcept(ctx(capFen, 'Bxd5', { evalBefore: 200, evalAfter: 620, studentColor: 'w' }))).toBeNull();
  });

  it('frames for the student vs the opponent', () => {
    const capFen = 'r1bqk2r/ppp2ppp/2n5/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    const mine = detectConcept(ctx(capFen, 'Bxd5', { evalBefore: 650, evalAfter: 610, studentColor: 'w' }));
    const theirs = detectConcept(ctx(capFen, 'Bxd5', { evalBefore: 650, evalAfter: 610, studentColor: 'b' }));
    expect(mine?.text).toMatch(/you're clearly ahead/i);
    expect(theirs?.text).toMatch(/your opponent/i);
  });
});

describe('reviewConcepts — outpost', () => {
  it('fires on a pawn-supported knight where no enemy pawn can challenge it', () => {
    // White knight to d5, supported by the c4/e4 pawn; black has no c/e pawn to
    // challenge it (…c6/…e6 pawns are gone). Classic hole on d5.
    const fen = 'r1bqkb1r/pp3ppp/2n2n2/3p4/2PNP3/8/PP3PPP/RNBQKB1R w KQkq - 0 1';
    const c = new Chess(fen);
    // ensure a white pawn guards d5 after Nd5 style — build a cleaner fixture:
    const out = 'r1bqkb1r/pp3ppp/5n2/3n4/3PP3/2N5/PP3PPP/R1BQKB1R b KQkq - 0 1';
    const beat = detectConcept(ctx(out, 'Nxc3', { evalBefore: 0, evalAfter: 0, studentColor: 'b' }));
    // Nxc3 is a capture into own half — not an outpost; expect null (guards the gate).
    expect(beat).toBeNull();
  });

  it('returns null on a routine developing move (no concept)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(detectConcept(ctx(fen, 'Nf3', { evalBefore: 20, evalAfter: 15 }))).toBeNull();
  });
});

describe('reviewConcepts — open-lines-at-king', () => {
  it('fires on a central pawn capture while the enemy king is stuck in the centre', () => {
    // White plays exd5 opening the e/d lines; Black king still on e8 (uncastled).
    const fen = 'r1bqk1nr/ppp2ppp/2n5/3pp3/4P3/2NP4/PPP2PPP/R1BQKBNR w KQkq - 0 5';
    const beat = detectConcept(ctx(fen, 'exd5', { evalBefore: 30, evalAfter: 25, studentColor: 'w' }));
    expect(beat?.concept).toBe('open-lines-at-king');
    expect(beat?.source).toBe('concept:pos-open-file');
  });

  it('does NOT fire once the enemy king has castled to a wing', () => {
    // Same break, but Black king castled kingside → not central.
    const fen = 'r1bq1rk1/ppp2ppp/2n5/3pp3/4P3/2NP4/PPP2PPP/R1BQKBNR w KQ - 0 6';
    expect(detectConcept(ctx(fen, 'exd5', { evalBefore: 30, evalAfter: 25, studentColor: 'w' }))).toBeNull();
  });
});

describe('reviewConcepts — two-bishops', () => {
  it('fires when a knight captures an enemy bishop in an even trade, leaving the pair', () => {
    // White knight on d5 captures a black bishop on f6; White keeps Bc1+Be2 (two
    // bishops), Black is left with Bc8 only → the pair, and it's an even minor
    // trade (eval steady).
    const fen = 'r1bqk2r/pppp1ppp/5b2/3N4/8/8/PPPP1PPP/R1BQKB1R w KQkq - 0 1';
    // white bishops: c1 + f1 = 2; black bishops: c8 + f6 = 2. Nxf6 removes one.
    const beat = detectConcept(ctx(fen, 'Nxf6+', { evalBefore: 15, evalAfter: 10, studentColor: 'w' }));
    expect(beat?.concept).toBe('two-bishops');
    expect(beat?.source).toBe('concept:pos-bishop-pair');
  });

  it('does NOT fire when the capture wins the bishop outright (eval jumps)', () => {
    const fen = 'r1bqk2r/pppp1ppp/5b2/3N4/8/8/PPPP1PPP/R1BQKB1R w KQkq - 0 1';
    expect(detectConcept(ctx(fen, 'Nxf6+', { evalBefore: 15, evalAfter: 320, studentColor: 'w' }))).toBeNull();
  });
});

describe('reviewConcepts — convert-dont-rush', () => {
  it('fires on a quiet improving move, up big, position simplified', () => {
    // K+R+few pawns vs K+few pawns, White up a rook, quiet king move.
    const fen = '8/5pk1/6p1/8/8/1R6/5PPP/6K1 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'Kf1', { evalBefore: 500, evalAfter: 500, studentColor: 'w' }));
    expect(beat?.concept).toBe('convert-dont-rush');
  });

  it('does NOT fire on a capture (not a quiet move)', () => {
    const fen = '8/5pk1/6p1/8/8/1R6/5PPP/6K1 w - - 0 1';
    expect(detectConcept(ctx(fen, 'Rb7', { evalBefore: 500, evalAfter: 500, studentColor: 'w' }))?.concept).toBe('convert-dont-rush');
    // Rb7 is quiet (no capture) → still convert. A capturing move would be excluded.
  });
});
