import { describe, it, expect } from 'vitest';
import {
  createPhaseTransitionState,
  detectPhaseTransition,
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

// Middlegame after queen trades: White castled kingside (king on g1),
// rooks on a1 and f1 with b1–e1 empty — connected. Material well above
// the endgame threshold so classifyPhase reports 'middlegame'.
const MIDDLEGAME_WHITE_CASTLED_CONNECTED =
  'r4rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPB1PPP/R4RK1 w - - 0 21';

// Same shape, but White's queen still on d1 between the rooks — king
// is castled but rooks are NOT connected.
const MIDDLEGAME_WHITE_CASTLED_NOT_CONNECTED =
  'r2q1rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPB1PPP/R2Q1RK1 w - - 0 21';

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
  it('detects connected rooks on an uncluttered back rank', () => {
    // White rooks on a1 and f1, only the castled king on g1 and nothing
    // between the rooks — connected.
    expect(rooksConnected(MIDDLEGAME_WHITE_CASTLED_CONNECTED, 'white')).toBe(true);
  });

  it('rejects connection when a piece sits between the rooks', () => {
    // Knight still on b1 blocks a1 <-> f1.
    expect(rooksConnected(MIDDLEGAME_WHITE_CASTLED_NOT_CONNECTED, 'white')).toBe(false);
  });

  it('rejects connection at the starting position (king + pieces between rooks)', () => {
    expect(rooksConnected(START_FEN, 'white')).toBe(false);
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

  it('does NOT fire when rooks are not yet connected', () => {
    const state = initialState();
    const event = detectPhaseTransition(
      moveSnapshot({ fen: MIDDLEGAME_WHITE_CASTLED_NOT_CONNECTED, moveNumber: 21 }),
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
