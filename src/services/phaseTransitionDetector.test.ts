import { describe, it, expect } from 'vitest';
import {
  centralPawnsResolved,
  countDevelopedMinors,
  createPhaseTransitionState,
  detectPhaseTransition,
  hasMajorPieceCaptured,
  rooksConnected,
  type LastMoveSnapshot,
  type PhaseTransitionState,
} from './phaseTransitionDetector';

// ── Helpers ───────────────────────────────────────────────────────────────

function moveSnapshot(overrides: Partial<LastMoveSnapshot> = {}): LastMoveSnapshot {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    san: 'e4',
    moveNumber: 1,
    isCoachMove: false,
    ...overrides,
  };
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Middlegame, White has castled, both rooks still on the back rank.
// Under WO-PHASE-FIX-01's relaxed rule, "rooks connected" means "both
// rooks on the back rank" — pieces like the queen on d1 no longer
// block connection, because the castled check already guarantees the
// king is out of the way and in-between minors will move out naturally.
const MIDDLEGAME_WHITE_CASTLED_CONNECTED =
  'r1bq1rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/R1B2RK1 w - - 0 21';

// Same shape but White has traded a rook off — one of the two rooks
// is gone, so even the relaxed rule rejects connection.
const MIDDLEGAME_WHITE_ROOK_TRADED =
  '4r1k1/pp3ppp/1qnp1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/5RK1 w - - 0 25';

// Past move 10, material > 13, but White hasn't castled (king on e1).
const MIDDLEGAME_WHITE_NOT_CASTLED =
  'r1bqkbnr/ppp2ppp/2n2n2/3pp3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 11';

// Endgame position: queens off, minimal material. Triggers by material.
const ENDGAME_KP_KP = '8/5k2/8/4P3/8/3K4/8/8 w - - 0 40';

// Queens off, each side has a rook — endgame-by-fallback trigger
// (queens off, ≤ 1 rook each).
const QUEENS_OFF_ONE_ROOK_EACH =
  '4k3/8/8/3r4/8/8/3R4/4K3 w - - 0 30';

// ── rooksConnected ────────────────────────────────────────────────────────

describe('rooksConnected', () => {
  it('detects two rooks on the back rank', () => {
    expect(rooksConnected(MIDDLEGAME_WHITE_CASTLED_CONNECTED, 'white')).toBe(true);
  });

  it('still returns true at the starting position (both rooks on back rank)', () => {
    // The detector combines this with castled, development threshold,
    // major-capture, and move-15 rules (WO-PHASE-FIX-03), so the loose
    // helper here is correct. Starting-position transitions are
    // prevented by Rule 1 needing move≥8, Rule 2 needing castled,
    // Rule 3 needing a capture, and Rule 4 needing move≥15.
    expect(rooksConnected(START_FEN, 'white')).toBe(true);
  });

  it('rejects connection when fewer than two rooks remain on the back rank', () => {
    expect(rooksConnected(MIDDLEGAME_WHITE_ROOK_TRADED, 'white')).toBe(false);
  });
});

// ── detectPhaseTransition: opening → middlegame ───────────────────────────

describe('detectPhaseTransition — opening → middlegame', () => {
  function initialState(): PhaseTransitionState {
    return createPhaseTransitionState();
  }

  it('fires when phase is middlegame AND student has castled AND rooks are connected', () => {
    const state = initialState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: MIDDLEGAME_WHITE_CASTLED_CONNECTED, moveNumber: 21, san: 'Re1' }),
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
    expect(state.openingToMiddlegameFired).toBe(true);
  });

  it('does NOT fire when no opening-end rule is satisfied (early game)', () => {
    // After 1.e4 e5 2.Nf3 Nf6 — each side has developed only one
    // minor piece, no castle, no captures, full-move 3. None of the
    // four WO-PHASE-FIX-03 rules can fire yet.
    const earlyOpening = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    const state = initialState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: earlyOpening, moveNumber: 5, san: 'Nf6' }),
      state,
      'white',
    );
    expect(event).toBeNull();
    expect(state.openingToMiddlegameFired).toBe(false);
  });

  it('does NOT fire when the student has not castled', () => {
    const state = initialState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: MIDDLEGAME_WHITE_NOT_CASTLED, moveNumber: 21 }),
      state,
      'white',
    );
    expect(event).toBeNull();
    expect(state.openingToMiddlegameFired).toBe(false);
  });

  it('fires at most once per game', () => {
    // Queens-on variant of the connected position so the endgame
    // fallback doesn't also fire on the second call. We're explicitly
    // testing the opening-to-middlegame ledger, not the endgame one.
    const QUEENS_ON_CONNECTED =
      'r4rk1/pp1q1ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/R4RK1 w - - 0 21';
    const state = initialState();
    const first = detectPhaseTransition(
      moveSnapshot({ fen: QUEENS_ON_CONNECTED, moveNumber: 21 }),
      state,
      'white',
    );
    expect(first?.kind).toBe('opening-to-middlegame');
    const second = detectPhaseTransition(
      moveSnapshot({ fen: QUEENS_ON_CONNECTED, moveNumber: 23 }),
      state,
      'white',
    );
    expect(second).toBeNull();
  });

  it('ignores coach moves entirely', () => {
    const state = initialState();
    const event = detectPhaseTransition(
      moveSnapshot({
        fen: MIDDLEGAME_WHITE_CASTLED_CONNECTED,
        moveNumber: 21,
        isCoachMove: true,
      }),
      state,
      'white',
    );
    expect(event).toBeNull();
    expect(state.openingToMiddlegameFired).toBe(false);
  });
});

// ── detectPhaseTransition: middlegame → endgame ───────────────────────────

describe('detectPhaseTransition — middlegame → endgame', () => {
  it('fires when classifyPhase reports endgame', () => {
    const state = createPhaseTransitionState();
    state.openingToMiddlegameFired = true; // pretend the opening-end already fired
    const event = detectPhaseTransition(
      moveSnapshot({ fen: ENDGAME_KP_KP, moveNumber: 79, san: 'Kd3' }),
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('middlegame-to-endgame');
    expect(state.middlegameToEndgameFired).toBe(true);
  });

  it('fires via the material fallback when queens are off and each side has ≤ 1 rook', () => {
    const state = createPhaseTransitionState();
    state.openingToMiddlegameFired = true;
    const event = detectPhaseTransition(
      moveSnapshot({ fen: QUEENS_OFF_ONE_ROOK_EACH, moveNumber: 61, san: 'Rd2' }),
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('middlegame-to-endgame');
  });

  it('does not refire after the endgame boundary has already fired', () => {
    const state = createPhaseTransitionState();
    // Both flags pre-set: this test isolates the endgame refire guard.
    // Without setting openingToMiddlegameFired, WO-PHASE-FIX-03's Rule
    // 4 (move ≥ 15) would emit opening-to-middlegame first on an
    // endgame FEN at move 41.
    state.openingToMiddlegameFired = true;
    state.middlegameToEndgameFired = true;
    const event = detectPhaseTransition(
      moveSnapshot({ fen: ENDGAME_KP_KP, moveNumber: 81 }),
      state,
      'white',
    );
    expect(event).toBeNull();
  });

  it('ignores coach moves at the endgame boundary too', () => {
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: ENDGAME_KP_KP, moveNumber: 79, isCoachMove: true }),
      state,
      'white',
    );
    expect(event).toBeNull();
  });
});

// ── Starting position sanity ─────────────────────────────────────────────

describe('detectPhaseTransition — starting position', () => {
  it('does not fire on move 1', () => {
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(moveSnapshot(), state, 'white');
    expect(event).toBeNull();
    expect(state.openingToMiddlegameFired).toBe(false);
    expect(state.middlegameToEndgameFired).toBe(false);
  });
});

// ── WO-PHASE-FIX-01 regression: fires in realistic middlegame ─────────────

describe('WO-PHASE-FIX-01 regression — relaxed rook-connection rule', () => {
  // Typical Italian-ish middlegame at move 11: White has castled, both
  // rooks still on the back rank, queen on d1 between them, minor
  // pieces developed. The original strict rule refused to fire here
  // (queen blocked connection) which is why phase narration never
  // triggered in live games. Under the relaxed rule this DOES fire.
  it('fires at move 11 with the queen still on d1 (the Dave scenario)', () => {
    const fen = 'r1bq1rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/R1B2RK1 w - - 0 21';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'Qd2', moveNumber: 21, isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });
});

// ── WO-PHASE-FIX-03: four-rule opening-end detection ─────────────────────

describe('countDevelopedMinors', () => {
  it('returns zero at the starting position', () => {
    expect(countDevelopedMinors(START_FEN)).toEqual({ white: 0, black: 0, total: 0 });
  });

  it('counts per side when both sides developed knights and one bishop each', () => {
    // r1bqk2r — black knights off b8/g8, f8-bishop off, c8-bishop home.
    // R1BQK2R — symmetric for white. Development = 3 each side.
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 8';
    expect(countDevelopedMinors(fen)).toEqual({ white: 3, black: 3, total: 6 });
  });
});

describe('hasMajorPieceCaptured', () => {
  it('returns false at the starting position', () => {
    expect(hasMajorPieceCaptured(START_FEN)).toBe(false);
  });

  it('returns true when a rook is missing', () => {
    expect(hasMajorPieceCaptured(MIDDLEGAME_WHITE_ROOK_TRADED)).toBe(true);
  });

  it('returns true when a queen is missing', () => {
    // Both queens off — after early trade.
    const fen = 'rnb1kbnr/ppp2ppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 5';
    expect(hasMajorPieceCaptured(fen)).toBe(true);
  });
});

describe('WO-PHASE-FIX-03 — opening-end rule set', () => {
  function ply(fullMove: number, side: 'white' | 'black'): number {
    // Helper: convert full-move + side to a ply number matching
    // moveCountRef semantics (1-indexed, odd=white's move).
    return side === 'white' ? fullMove * 2 - 1 : fullMove * 2;
  }

  it('Rule 1: fires when both sides have 3+ developed minors and fullMove >= 8', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 8';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'O-O', moveNumber: ply(8, 'black'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 1: does NOT fire at fullMove 7 even with full development (move threshold)', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'Bb4', moveNumber: ply(7, 'black'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).toBeNull();
  });

  it('Rule 3: fires when a queen is captured (major piece trade)', () => {
    // Early queen trade — fullMove 5, no development, no castle.
    // Only Rule 3 can fire here.
    const fen = 'rnb1kbnr/ppp2ppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 5';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'Qxe7', moveNumber: ply(5, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 3: fires when a rook is captured', () => {
    // Same MIDDLEGAME_WHITE_ROOK_TRADED fixture — rooks missing, this
    // now correctly fires under Rule 3 (previously this test asserted
    // null, which was wrong under the four-rule spec; see updated
    // early-game no-fire test above for the now-correct negative case).
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: MIDDLEGAME_WHITE_ROOK_TRADED, moveNumber: ply(10, 'white') }),
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 4: fires at fullMove 15 safety net regardless of development', () => {
    // Starting-position FEN at fullMove 15 — nothing developed, no
    // castle, no captures. Rule 4 is the safety net that guarantees
    // the transition fires by move 15 at latest.
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: START_FEN, moveNumber: ply(15, 'white'), san: 'a4' }),
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 4: does NOT fire one full-move early (fullMove 14)', () => {
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: START_FEN, moveNumber: ply(14, 'white') }),
      state,
      'white',
    );
    expect(event).toBeNull();
  });

  it('classifyPhase no longer gates opening→middlegame', () => {
    // FEN where classifyPhase() would return 'opening' (fullMove ≤ 10)
    // but Rule 2 (castled + rooks connected) IS satisfied. Before
    // WO-PHASE-FIX-03 this was rejected by the classifyPhase gate; now
    // the rule set is self-sufficient and the transition fires.
    const fen = 'r4rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/R4RK1 w - - 0 9';
    const state = createPhaseTransitionState();
    // Ply 17 → fullMove 9 → classifyPhase says 'opening' (≤ 10).
    const event = detectPhaseTransition(
      { fen, san: 'Nf3', moveNumber: 17, isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });
});

describe('WO-PHASE-FIX-02 — broadened opening→middlegame triggers', () => {
  function ply(fullMove: number, side: 'white' | 'black'): number {
    return side === 'white' ? fullMove * 2 - 1 : fullMove * 2;
  }

  // Real middlegame position from Dave's "never-castled" pattern:
  // King still on e1, but central pawns are gone, both sides have 5+
  // minors developed. Rule 5 should fire. (Castling rights cleared so
  // hasCastled returns false but king is still on e-file → not castled.)
  const NEVER_CASTLED_FEN = 'r2qk2r/pp3ppp/2nb1n2/2pPp3/2P1P3/2N1BN2/PP3PPP/R2QK2R w Kkq - 0 9';

  it('centralPawnsResolved: true when both d-pawns and both e-pawns have moved', () => {
    expect(centralPawnsResolved(NEVER_CASTLED_FEN)).toBe(true);
  });

  it('centralPawnsResolved: false at the starting position', () => {
    expect(centralPawnsResolved('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(false);
  });

  it('centralPawnsResolved: false when only one e-pawn has moved', () => {
    expect(centralPawnsResolved('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe(false);
  });

  it('Rule 5: fires when central pawns are resolved AND minors ≥ 5 (Dave never-castled scenario)', () => {
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen: NEVER_CASTLED_FEN, san: 'Be3', moveNumber: ply(9, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 6: fires when one side has all 4 minors developed AND fullMove ≥ 10', () => {
    // White has all four minors out (Nf3, Nc3, Bf4, Be2), black has only one knight out.
    // No castling. fullMove 10. Rule 1 wouldn't fire (black dev = 1). Rule 6 should.
    const fen = 'r1bqkbnr/pppppppp/2n5/8/8/2N1BN2/PPPPBPPP/R2QK2R w KQkq - 0 10';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'Nf3', moveNumber: ply(10, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Rule 7: fires at fullMove 12 when total minor development ≥ 5', () => {
    // King uncastled, no major captures, dev.total = 6 (3 each side), fullMove 12.
    const fen = 'r2qkb1r/pppbpppp/2np1n2/8/3P4/2N1BN2/PPP1PPPP/R2QKB1R w KQkq - 0 12';
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen, san: 'Be3', moveNumber: ply(12, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
    expect(event?.kind).toBe('opening-to-middlegame');
  });

  it('Never-castled regression: a 13+ move game with central pawns gone fires before Rule 4', () => {
    // Composite scenario — confirms the new rules close the gap Dave
    // identified: phase fires WITHOUT requiring castling and WITHOUT
    // waiting for fullMove 15.
    const state = createPhaseTransitionState();
    const event = detectPhaseTransition(
      { fen: NEVER_CASTLED_FEN, san: 'Be3', moveNumber: ply(13, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(event).not.toBeNull();
  });

  it('preserves the deterministic-fire-once invariant across all new rules', () => {
    const state = createPhaseTransitionState();
    const first = detectPhaseTransition(
      { fen: NEVER_CASTLED_FEN, san: 'Be3', moveNumber: ply(9, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(first).not.toBeNull();
    // A second qualifying position must NOT re-fire.
    const second = detectPhaseTransition(
      { fen: NEVER_CASTLED_FEN, san: 'Bc4', moveNumber: ply(11, 'white'), isCoachMove: false },
      state,
      'white',
    );
    expect(second).toBeNull();
  });
});
