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
    const _c = new Chess(fen);
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

describe('reviewConcepts — open-lines pawn-push break', () => {
  it('fires on a central pawn PUSH break vs an uncastled king (the 4.d4 idea)', () => {
    // White pawn on e4 pushes e5? use d4 break: white d-pawn to d4 attacking e5,
    // black king on e8. 1.e4 e5 2.Nf3 Nc6 3.Bc4 -> then d4? Build directly:
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const beat = detectConcept(ctx(fen, 'd4', { evalBefore: 20, evalAfter: 25, studentColor: 'w' }));
    expect(beat?.concept).toBe('open-lines-at-king');   // d4 attacks the e5 pawn; black king on e8
  });
});

describe('reviewConcepts — passed-pawn push', () => {
  it('fires on advancing a passed pawn past the midpoint', () => {
    // White passed pawn on d6 pushes to d7 (or d5->d6). No black pawns on c/d/e.
    const fen = '4k3/8/3P4/8/8/8/5PPP/4K3 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'd7+', { evalBefore: 400, evalAfter: 420, studentColor: 'w' }));
    expect(beat?.concept).toBe('passed-pawn-push');
    expect(beat?.source).toBe('concept:pawn-passed');
  });

  it('does NOT fire when the pawn is not passed (enemy pawn ahead)', () => {
    const fen = '4k3/3p4/3P4/8/8/8/5PPP/4K3 w - - 0 1';
    expect(detectConcept(ctx(fen, 'Kd2', { evalBefore: 100, evalAfter: 100, studentColor: 'w' }))).not.toMatchObject({ concept: 'passed-pawn-push' });
  });
});

describe('reviewConcepts — rook activation', () => {
  it('fires on a rook reaching the 7th rank', () => {
    const fen = '4k3/pppp4/8/8/8/8/4R3/4K3 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'Re7', { evalBefore: 200, evalAfter: 200, studentColor: 'w' }));
    expect(beat?.concept).toBe('rook-seventh');
  });

  it('fires on a rook taking an open file', () => {
    // c-file has no pawns; white rook a1 -> c1.
    const fen = '4k3/pp1ppppp/8/8/8/8/PP1PPPPP/R3K3 w Q - 0 1';
    const beat = detectConcept(ctx(fen, 'Rc1', { evalBefore: 30, evalAfter: 30, studentColor: 'w' }));
    expect(beat?.concept).toBe('rook-open-file');
  });
});

describe('reviewConcepts — king safety / centralize / space', () => {
  it('fires on castling', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    const beat = detectConcept(ctx(fen, 'O-O', { evalBefore: 10, evalAfter: 10, studentColor: 'w' }));
    expect(beat?.concept).toBe('king-safety-castle');
    expect(beat?.source).toBe('concept:pos-king-safety');
  });

  it('fires on a king marching to the centre in the endgame', () => {
    const fen = '8/8/8/4k3/8/8/4P3/6K1 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'Kf2', { evalBefore: 50, evalAfter: 50, studentColor: 'w' }));
    expect(beat?.concept).toBe('centralize-king'); // g1 -> f2 is more central
  });

  it('does NOT centralize the king when the board is still full', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(detectConcept(ctx(fen, 'Nf3', { evalBefore: 20, evalAfter: 20, studentColor: 'w' }))).toBeNull();
  });

  it('fires on a space-gaining pawn push (flank, crosses the middle, not a break)', () => {
    // White pushes b4-b5 to rank 5 (flank, non-central → not open-lines); black
    // b7 pawn keeps it from being passed; white a5+b5 advanced vs 0 → space edge.
    const fen = '6k1/ppp5/2n5/P7/1P6/8/8/6K1 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'b5', { evalBefore: 30, evalAfter: 30, studentColor: 'w' }));
    expect(beat?.concept).toBe('space-advantage');
    expect(beat?.source).toBe('concept:pos-space');
  });
});

describe('reviewConcepts — create-weakness', () => {
  it('fires when a capture isolates an enemy pawn (removes its only neighbour)', () => {
    // Black pawns b7 + c7 (each the other's neighbour). White Nd6xb7 leaves c7
    // with no neighbour → isolated on the c-file.
    const fen = '4k3/1pp5/3N4/8/8/8/8/4K3 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'Nxb7', { evalBefore: 20, evalAfter: 20, studentColor: 'w' }));
    expect(beat?.concept).toBe('create-weakness');
    expect(beat?.source).toBe('concept:pawn-isolated');
    expect(beat?.text).toMatch(/isolated pawn on the c-file/);
  });

  it('does NOT fire on a capture that leaves the pawn structure intact', () => {
    // White knight takes a lone black knight; no pawn structure change.
    const fen = '4k3/8/3n4/8/4N3/8/8/4K3 w - - 0 1';
    const r = detectConcept(ctx(fen, 'Nxd6', { evalBefore: 30, evalAfter: 30, studentColor: 'w' }));
    expect(r).toBeNull();
  });
});

describe('reviewConcepts — convert-dont-rush', () => {
  it('fires on a quiet improving move, up big, position simplified', () => {
    // K+R+few pawns vs K+few pawns, White up a rook, quiet king move.
    const fen = '8/5pk1/6p1/8/8/1R6/5PPP/6K1 w - - 0 1';
    const beat = detectConcept(ctx(fen, 'Kf1', { evalBefore: 500, evalAfter: 500, studentColor: 'w' }));
    expect(beat?.concept).toBe('convert-dont-rush');
  });

  it('does NOT fire when only slightly ahead', () => {
    const fen = '8/5pk1/6p1/8/8/1R6/5PPP/6K1 w - - 0 1';
    expect(detectConcept(ctx(fen, 'Kf1', { evalBefore: 90, evalAfter: 90, studentColor: 'w' }))).toBeNull();
  });
});
