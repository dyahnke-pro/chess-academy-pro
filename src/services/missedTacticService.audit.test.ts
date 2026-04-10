import { describe, it, expect } from 'vitest';
import { detectTacticType } from './missedTacticService';

// ── Promotion ──────────────────────────────────────────────────────────────
describe('audit: promotion', () => {
  it('detects white pawn promoting to queen', () => {
    // White pawn a7, kings on h1/h8
    expect(detectTacticType('7k/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8q')).toBe('promotion');
  });

  it('does NOT detect promotion for non-pawn reaching rank 8', () => {
    // White rook a7 moves to a8 — not promotion
    expect(detectTacticType('7k/R7/8/8/8/8/8/7K w - - 0 1', 'a7a8')).not.toBe('promotion');
  });
});

// ── Double Check ───────────────────────────────────────────────────────────
describe('audit: double_check', () => {
  it('detects double check from knight + bishop', () => {
    // Ne5-d7: knight checks f6 king from d7, discovers Ba1 check along a1-f6 diagonal
    expect(detectTacticType('8/8/5k2/4N3/8/8/8/B5K1 w - - 0 1', 'e5d7')).toBe('double_check');
  });

  it('does NOT detect double check when only one piece gives check', () => {
    // Same move but no bishop — only knight check from d7
    expect(detectTacticType('8/8/5k2/4N3/8/8/8/6K1 w - - 0 1', 'e5d7')).not.toBe('double_check');
  });
});

// ── Back Rank ──────────────────────────────────────────────────────────────
describe('audit: back_rank', () => {
  it('detects back rank check with rook', () => {
    // Ra1-a8+ with king trapped behind pawns on f7/g7/h7
    expect(detectTacticType('6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1', 'a1a8')).toBe('back_rank');
  });

  it('does NOT detect back rank when king is not on rank 1 or 8', () => {
    // Rook checks king on rank 5 — not back rank
    expect(detectTacticType('8/8/8/6k1/8/4K3/8/R7 w - - 0 1', 'a1a5')).not.toBe('back_rank');
  });

  it('does NOT detect back rank for knight check on rank 8', () => {
    // Knight check on g8 — not a rook/queen, not a back rank pattern
    expect(detectTacticType('r1b1k2r/ppppqppp/2n2n2/4N3/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 1', 'e5f7')).not.toBe('back_rank');
  });

  it('detects back rank with queen horizontal check and trapped king', () => {
    // Qa1-a8+ with king trapped behind pawns on f7/g7/h7
    expect(detectTacticType('6k1/5ppp/8/8/8/8/8/Q3K3 w Q - 0 1', 'a1a8')).toBe('back_rank');
  });

  it('does NOT detect back rank when king has ample escape squares', () => {
    // Ra1-a8+ but king on e8 with d7, f7 open — king can flee
    expect(detectTacticType('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1', 'a1a8')).not.toBe('back_rank');
  });
});

// ── Fork ───────────────────────────────────────────────────────────────────
describe('audit: fork', () => {
  it('detects knight fork on king and rook', () => {
    // Nd3-e5+ checks king d7 and attacks rook c6
    expect(detectTacticType('8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1', 'd3e5')).toBe('fork');
  });

  it('detects fork of two valuable pieces without check', () => {
    // Nd3-e5 attacks queen f7 (value 9) and rook c6 (value 5) — two pieces >= 3
    expect(detectTacticType('7k/5q2/2r5/8/8/3N4/8/K7 w - - 0 1', 'd3e5')).toBe('fork');
  });

  it('does NOT detect fork when only attacking one piece (no check)', () => {
    // Knight attacks only one valuable piece, no check
    expect(detectTacticType('4k3/8/8/2N5/8/8/8/7K w - - 0 1', 'c5d7')).not.toBe('fork');
  });
});

// ── Pin ────────────────────────────────────────────────────────────────────
describe('audit: pin', () => {
  it('detects rook pin on file (piece pinned to king)', () => {
    // Ra2-a1 pins knight on a4 to king on a8
    expect(detectTacticType('k7/8/8/8/n7/8/R7/7K w - - 0 1', 'a2a1')).toBe('pin');
  });

  it('does NOT detect pin when pieces on ray are same value', () => {
    // Rook on ray with two enemy rooks — same value, not a pin
    expect(detectTacticType('r7/8/8/8/r7/8/R7/7K w - - 0 1', 'a2a1')).not.toBe('pin');
  });
});

// ── Skewer ─────────────────────────────────────────────────────────────────
describe('audit: skewer', () => {
  it('detects rook skewer (queen in front, rook behind)', () => {
    // Rb1-a1 skewers queen a4 (value 9) through to rook a8 (value 5)
    expect(detectTacticType('r6k/8/8/8/q7/8/8/1R5K w - - 0 1', 'b1a1')).toBe('skewer');
  });

  it('does NOT detect skewer when less valuable piece is in front', () => {
    // Knight in front (value 3), queen behind (value 9) — that's a pin, not a skewer
    expect(detectTacticType('q6k/8/8/8/n7/8/7K/1R6 w - - 0 1', 'b1a1')).not.toBe('skewer');
  });
});

// ── Discovered Attack ──────────────────────────────────────────────────────
describe('audit: discovered_attack', () => {
  it('detects discovered attack when piece uncovers rook attack', () => {
    // White bishop on e4 blocks white rook on e1 from attacking black queen on e7
    // Be4-f5 uncovers Re1 → Qe7 along the e-file
    expect(detectTacticType('k7/4q3/8/8/4B3/8/8/K3R3 w - - 0 1', 'e4f5')).toBe('discovered_attack');
  });

  it('does NOT detect discovered attack when no slider is behind', () => {
    // Bishop moves but no friendly slider behind it on the e-file
    expect(detectTacticType('k7/4q3/8/8/4B3/8/8/K7 w - - 0 1', 'e4f5')).not.toBe('discovered_attack');
  });
});

// ── Removing the Guard ────────────────────────────────────────────────────
describe('audit: removing_the_guard', () => {
  it('detects removing the guard when capture removes defender of a valuable piece', () => {
    // Black bishop on d5 defends the queen on e6.
    // White Rxd5 captures the bishop, and the queen on e6 is now undefended.
    expect(detectTacticType('k7/8/4q3/3b4/8/8/8/3R3K w - - 0 1', 'd1d5')).toBe('removing_the_guard');
  });

  it('does NOT detect removing the guard when captured piece was not defending anything valuable', () => {
    // Capture a pawn that isn't defending anything worth >= 3
    const result = detectTacticType('k7/8/8/3p4/8/8/8/3R3K w - - 0 1', 'd1d5');
    expect(result).not.toBe('removing_the_guard');
  });
});

// ── Hanging Piece ──────────────────────────────────────────────────────────
describe('audit: hanging_piece', () => {
  it('detects capture of undefended piece', () => {
    // White knight captures undefended black bishop on d5
    expect(detectTacticType('7k/8/8/3b4/8/2N5/8/7K w - - 0 1', 'c3d5')).toBe('hanging_piece');
  });

  it('does NOT label capture of defended piece as hanging', () => {
    // Black bishop on d5 defended by pawn on e6 — should be tactical_sequence
    expect(detectTacticType('7k/8/4p3/3b4/8/2N5/8/7K w - - 0 1', 'c3d5')).not.toBe('hanging_piece');
  });
});

// ── Tactical Sequence (fallback) ───────────────────────────────────────────
describe('audit: tactical_sequence', () => {
  it('returns tactical_sequence for quiet pawn push', () => {
    expect(detectTacticType('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4')).toBe('tactical_sequence');
  });

  it('returns tactical_sequence for capture of defended piece with no tactic', () => {
    // Knight captures defended bishop — no higher tactic applies
    expect(detectTacticType('7k/8/4p3/3b4/8/2N5/8/7K w - - 0 1', 'c3d5')).toBe('tactical_sequence');
  });
});

// ── Priority Ordering ──────────────────────────────────────────────────────
describe('audit: priority ordering', () => {
  it('back_rank beats fork (queen delivers back rank check + attacks piece)', () => {
    // Qa1-a8+ is back rank check on king g8 (behind f7/g7/h7 pawns)
    // Also attacks black rook c6 on diagonal — but back_rank takes priority
    expect(detectTacticType('6k1/5ppp/2r5/8/8/8/8/Q6K w - - 0 1', 'a1a8')).toBe('back_rank');
  });

  it('fork beats pin when both apply', () => {
    // Nc5-e6 attacks queen d8 and rook f8 (fork of two pieces ≥3)
    // Also might create a pin — but fork is checked first
    const result = detectTacticType('3q1rk1/8/8/2N5/8/8/8/7K w - - 0 1', 'c5e6');
    expect(result).toBe('fork');
  });
});
