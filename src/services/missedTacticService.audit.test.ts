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
    // Nd6-f7: knight checks e8 king directly, discovers Bb5 check along b5-e8 diagonal
    expect(detectTacticType('4k3/8/3N4/1B6/8/8/8/6K1 w - - 0 1', 'd6f7')).toBe('double_check');
  });

  it('does NOT detect double check when only one piece gives check', () => {
    // Same but no bishop — only knight check
    expect(detectTacticType('4k3/8/3N4/8/8/8/8/6K1 w - - 0 1', 'd6f7')).not.toBe('double_check');
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
});

// ── Fork ───────────────────────────────────────────────────────────────────
describe('audit: fork', () => {
  it('detects knight fork on king and rook', () => {
    // Nc5-c7 attacks king e8 and rook a8
    expect(detectTacticType('r3k3/8/8/2N5/8/8/8/7K w - - 0 1', 'c5c7')).toBe('fork');
  });

  it('detects fork via check + one valuable piece', () => {
    // Nd5-f6+ checks king g8 and attacks queen on e8
    expect(detectTacticType('4q1k1/8/8/3N4/8/8/8/7K w - - 0 1', 'd5f6')).toBe('fork');
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
    // Ra1 attacks queen on a4, rook behind on a8 — queen more valuable, so skewer
    // Wait, we need to MOVE to create the skewer. Rb1-a1 skewers queen a4 → rook a8
    expect(detectTacticType('r7/8/8/8/q7/8/8/1R5K w - - 0 1', 'b1a1')).toBe('skewer');
  });

  it('does NOT detect skewer when less valuable piece is in front', () => {
    // Knight in front, queen behind — that's a pin, not a skewer
    expect(detectTacticType('q7/8/8/8/n7/8/8/1R5K w - - 0 1', 'b1a1')).not.toBe('skewer');
  });
});

// ── Discovered Attack ──────────────────────────────────────────────────────
describe('audit: discovered_attack', () => {
  it('detects discovered attack when piece uncovers rook attack', () => {
    // White bishop on d4 blocks white rook on a4 from attacking black queen on h4
    // Bd4-e5 uncovers Ra4 → Qh4 along rank 4
    expect(detectTacticType('7k/8/8/8/R2B3q/8/8/7K w - - 0 1', 'd4e5')).toBe('discovered_attack');
  });

  it('does NOT detect discovered attack when no slider is behind', () => {
    // Bishop moves but no friendly slider behind it
    expect(detectTacticType('7k/8/8/8/3B3q/8/8/7K w - - 0 1', 'd4e5')).not.toBe('discovered_attack');
  });
});

// ── Deflection ─────────────────────────────────────────────────────────────
describe('audit: deflection', () => {
  it('detects deflection when capture removes a key defender', () => {
    // Black rook on d8 defends black queen on d4. White captures Rxd8, removing the defender.
    // After capture, queen on d4 should be undefended.
    expect(detectTacticType('3r2k1/8/8/8/3q4/8/8/3R2K1 w - - 0 1', 'd1d8')).toBe('deflection');
  });

  it('does NOT detect deflection when captured piece was not defending anything valuable', () => {
    // Capture a piece that isn't defending anything worth ≥3
    const result = detectTacticType('7k/8/8/3p4/8/8/8/3R2K1 w - - 0 1', 'd1d5');
    expect(result).not.toBe('deflection');
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
  it('back_rank beats fork (rook delivers back rank check + attacks piece)', () => {
    // Ra1-a8+ is back rank check on king g8 (behind f7/g7/h7 pawns)
    // Also attacks black rook on e8 — but back_rank takes priority
    expect(detectTacticType('4r1k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1', 'a1a8')).toBe('back_rank');
  });

  it('fork beats pin when both apply', () => {
    // Nc5-e6 attacks queen d8 and rook f8 (fork of two pieces ≥3)
    // Also might create a pin — but fork is checked first
    const result = detectTacticType('3q1rk1/8/8/2N5/8/8/8/7K w - - 0 1', 'c5e6');
    expect(result).toBe('fork');
  });
});
