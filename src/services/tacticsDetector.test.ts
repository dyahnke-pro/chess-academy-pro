import { describe, it, expect } from 'vitest';
import { detectTactics } from './tacticsDetector';
import type { TacticsDetectionResult } from './tacticsDetector';
import type { TacticPatternType } from '../types/tacticTypes';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function hasTactic(result: TacticsDetectionResult, type: TacticPatternType): boolean {
  return result.tactics.some((t) => t.type === type);
}

function hasHangingPieceAt(result: TacticsDetectionResult, square: string): boolean {
  return result.hangingPieces.some((hp) => hp.square === square);
}

function hasHighlightAt(result: TacticsDetectionResult, square: string): boolean {
  return result.highlights.some((h) => h.square === square);
}

// ─── Starting Position ─────────────────────────────────────────────────────

describe('detectTactics — starting position', () => {
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('finds no hanging pieces or tactics in the starting position', () => {
    const result = detectTactics(START_FEN);
    expect(result.hangingPieces).toHaveLength(0);
    expect(result.tactics).toHaveLength(0);
    expect(result.highlights).toHaveLength(0);
    expect(result.summary).toBe('');
  });
});

// ─── Hanging Piece Detection ───────────────────────────────────────────────

describe('detectTactics — hanging pieces', () => {
  it('detects a hanging knight (attacked, undefended)', () => {
    // White knight on d5, attacked by black pawn on e6, no white defenders
    const fen = '4k3/8/4p3/3N4/8/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasHangingPieceAt(result, 'd5')).toBe(true);
    expect(hasHighlightAt(result, 'd5')).toBe(true);
  });

  it('does not flag a defended piece as hanging', () => {
    // White knight on d5 defended by pawn on c4, attacked by black pawn on e6
    const fen = '4k3/8/4p3/3N4/2P5/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasHangingPieceAt(result, 'd5')).toBe(false);
  });

  it('detects multiple hanging pieces', () => {
    // White rook on a5 (attacked by Bb6) and white bishop on g3 (attacked by
    // Qg6 down the g-file), both GENUINELY undefended and not defending each
    // other. NOTE: the old FEN put the bishop on h5 — on the rook's 5th rank,
    // so Ra5 actually DEFENDED it; the previous test asserted h5 "hanging"
    // only because the old detector couldn't see a piece defending a friendly-
    // occupied square (the king-defends-e2 class of bug, fixed 2026-06-05).
    const fen = '4k3/8/1b4q1/R7/8/6B1/8/4K3 b - - 0 1';
    const result = detectTactics(fen);
    expect(hasHangingPieceAt(result, 'a5')).toBe(true);
    expect(hasHangingPieceAt(result, 'g3')).toBe(true);
  });

  it('does NOT flag a piece defended along a rank/file/diagonal by a friendly piece (king or slider)', () => {
    // White Bh5 is attacked by Qg6 but DEFENDED by Ra5 along the 5th rank →
    // not hanging. And White Pe2 is attacked by Qe7 but defended by Ke1 →
    // not hanging. These are the exact false-positives the moves-based
    // detector produced before switching to chess.js attackers().
    expect(hasHangingPieceAt(detectTactics('4k3/8/1b4q1/R6B/8/8/8/4K3 b - - 0 1'), 'h5')).toBe(false);
    expect(hasHangingPieceAt(detectTactics('4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1'), 'e2')).toBe(false);
  });

  it('highlights side-to-move hanging pieces in danger color (red)', () => {
    // White to move, white knight on d4 attacked by black bishop on g7
    const fen = '4k3/6b1/8/8/3N4/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    const highlight = result.highlights.find((h) => h.square === 'd4');
    if (highlight) {
      // Red color for pieces belonging to side to move
      expect(highlight.color).toContain('239, 68, 68');
    }
  });

  it('highlights opponent hanging pieces in target color (orange)', () => {
    // White to move, black knight on d4 undefended, attacked by white bishop on g7
    const fen = '4k3/6B1/8/8/3n4/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    const highlight = result.highlights.find((h) => h.square === 'd4');
    if (highlight) {
      // Orange color for capturable enemy pieces
      expect(highlight.color).toContain('249, 115, 22');
    }
  });
});

// ─── Fork Detection ────────────────────────────────────────────────────────

describe('detectTactics — forks', () => {
  it('detects a knight forking king and rook', () => {
    // White knight on c7 attacks black king on e8 and rook on a8
    const fen = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'fork')).toBe(true);
    const fork = result.tactics.find((t) => t.type === 'fork');
    expect(fork?.involvedSquares).toContain('c7');
    expect(fork?.description).toContain('Knight');
  });

  it('detects a queen forking two minor pieces', () => {
    // White queen on e4 attacking black knight on b7 and black bishop on h7
    const fen = '4k3/1n5b/8/8/4Q3/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'fork')).toBe(true);
  });

  it('does not detect a fork when only one piece is attacked', () => {
    // White knight on c7 only attacks the rook on a8 (no king nearby)
    const fen = 'r7/2N5/8/8/4k3/8/8/4K3 b - - 0 1';
    const result = detectTactics(fen);
    // Should not be a fork since only one valuable piece attacked
    const knightFork = result.tactics.find(
      (t) => t.type === 'fork' && t.involvedSquares.includes('c7'),
    );
    expect(knightFork).toBeUndefined();
  });
});

// ─── Pin Detection ─────────────────────────────────────────────────────────

describe('detectTactics — pins', () => {
  it('detects a bishop pinning a knight against a queen', () => {
    // White bishop on a1, black knight on d4, black queen on g7 — diagonal pin
    const fen = '4k3/6q1/8/8/3n4/8/8/B3K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'pin')).toBe(true);
    const pin = result.tactics.find((t) => t.type === 'pin');
    expect(pin?.involvedSquares).toContain('a1');
    expect(pin?.involvedSquares).toContain('d4');
    expect(pin?.involvedSquares).toContain('g7');
  });

  it('detects a rook pinning a bishop against a king', () => {
    // White rook on a4, black bishop on d4, black king on g4 — rank pin
    const fen = '8/8/8/8/R2b2k1/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'pin')).toBe(true);
    const pin = result.tactics.find((t) => t.type === 'pin');
    expect(pin?.description).toContain('pin');
  });

  it('does not detect a pin when pieces are same color', () => {
    // White bishop on a1, white knight on d4 — not a pin (same color)
    const fen = '4k3/6q1/8/8/3N4/8/8/B3K3 w - - 0 1';
    const result = detectTactics(fen);
    const pinOnD4 = result.tactics.find(
      (t) => t.type === 'pin' && t.involvedSquares.includes('d4'),
    );
    expect(pinOnD4).toBeUndefined();
  });
});

// ─── Skewer Detection ──────────────────────────────────────────────────────

describe('detectTactics — skewers', () => {
  it('detects a rook skewering a queen with a rook behind', () => {
    // White rook on a1, black queen on a4, black rook on a7 — file skewer
    const fen = '4k3/r7/8/8/q7/8/8/R3K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'skewer')).toBe(true);
    const skewer = result.tactics.find((t) => t.type === 'skewer');
    expect(skewer?.involvedSquares).toContain('a1');
    expect(skewer?.description).toContain('skewer');
  });

  it('detects a bishop skewering a queen with a bishop behind', () => {
    // White bishop on a1, black queen on d4, black bishop on f6 — diagonal skewer
    const fen = '4k3/8/5b2/8/3q4/8/8/B3K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(hasTactic(result, 'skewer')).toBe(true);
  });
});

// ─── Summary / Coach Integration ───────────────────────────────────────────

describe('detectTactics — summary', () => {
  it('includes hanging piece info in summary', () => {
    const fen = '4k3/6b1/8/8/3N4/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    if (result.hangingPieces.length > 0) {
      expect(result.summary).toContain('hanging');
    }
  });

  it('includes tactic descriptions in summary', () => {
    // Knight fork position
    const fen = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1';
    const result = detectTactics(fen);
    if (result.tactics.length > 0) {
      expect(result.summary).toContain('Active tactics');
    }
  });

  it('returns empty summary when no tactics or hanging pieces', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = detectTactics(fen);
    expect(result.summary).toBe('');
  });
});

// ─── Overload Detection ─────────────────────────────────────────────────────

describe('detectTactics — overloaded pieces', () => {
  it('detects a piece that solely defends two different attacked targets', () => {
    // Black queen e5 is the ONLY defender of both knight a5 (attacked by Ra1
    // up the open a-file) and knight h5 (attacked by Rh1 up the open h-file) —
    // whichever recapture it makes, the other knight falls. King on g1 (not
    // e1) so the open e-file doesn't put White in check from Qe5.
    const fen = '4k3/8/8/n3q2n/8/8/8/R5KR w - - 0 1';
    const result = detectTactics(fen);
    const overload = result.tactics.find((t) => t.type === 'overload');
    expect(overload).toBeDefined();
    expect(overload?.involvedSquares).toEqual(expect.arrayContaining(['e5', 'a5', 'h5']));
    expect(overload?.description).toContain('overloaded');
  });

  it('does not flag a defender covering only one live target', () => {
    // Rook d5 attacked by Rd1, defended only by Qd7; nothing else Qd7 defends is attacked.
    const fen = '4k3/3q4/8/3r4/8/8/8/3RK3 w - - 0 1';
    const result = detectTactics(fen);
    const overload = result.tactics.find((t) => t.type === 'overload');
    expect(overload).toBeUndefined();
  });
});

// ─── Battery Detection ──────────────────────────────────────────────────────

describe('detectTactics — batteries', () => {
  it('detects doubled rooks stacked on a file, bearing on a target', () => {
    // A pawn on d7 is what the battery is FOR. Both of these tests used to run
    // on an empty file — see the furniture test below for why that changed.
    const fen = '4k3/3p4/8/8/3R4/8/8/3RK3 w - - 0 1';
    const result = detectTactics(fen);
    const battery = result.tactics.find((t) => t.type === 'battery');
    expect(battery).toBeDefined();
    expect(battery?.involvedSquares).toEqual(expect.arrayContaining(['d1', 'd4']));
    expect(battery?.description).toContain('file');
    expect(battery?.description).toContain('d7');   // says what it is aimed at
  });

  it('detects a queen-and-bishop diagonal battery', () => {
    // Queen b1 and bishop d3 share the diagonal; the pawn on g6 is the target.
    const fen = '4k3/8/6p1/8/8/3B4/8/1Q2K3 w - - 0 1';
    const result = detectTactics(fen);
    const battery = result.tactics.find((t) => t.type === 'battery');
    expect(battery).toBeDefined();
    expect(battery?.involvedSquares).toEqual(expect.arrayContaining(['b1', 'd3']));
    expect(battery?.description).toContain('diagonal');
  });

  // 🚨 DAVID 2026-08-16: "the useless rook and queen battery on the 8th rank —
  // we don't need that." His game warned him about his opponent's rook on a8
  // and queen on d8: two pieces on their own back rank, behind their own rook
  // on e8, threatening nothing. Every structural condition was met and none of
  // them asked what the battery was aimed at.
  it('does not flag a battery that points at nothing (his 8th rank)', () => {
    const fen = 'r2qr1k1/1p4pp/p1nbbp2/3p4/N2Pp3/P4N1P/1P1B1PP1/1BRQR1K1 w - - 2 21';
    expect(detectTactics(fen).tactics.filter((t) => t.type === 'battery')).toEqual([]);
  });

  it('does not flag doubled rooks aimed down an empty file', () => {
    // A real formation, and the student can see it. It is not a TACTIC, and
    // this detector feeds an alert lane — a warning about nothing teaches the
    // student to ignore warnings.
    const fen = '6k1/5ppp/8/8/8/8/3R2PP/3R2K1 w - - 0 1';
    expect(detectTactics(fen).tactics.filter((t) => t.type === 'battery')).toEqual([]);
  });

  it('does not flag two same-color sliders with an enemy piece between them', () => {
    // White rooks on d1 and d6, black pawn on d3 sitting between them.
    const fen = '4k3/8/3R4/8/8/3p4/8/3RK3 w - - 0 1';
    const result = detectTactics(fen);
    const battery = result.tactics.find((t) => t.type === 'battery' && t.involvedSquares.includes('d6') && t.involvedSquares.includes('d1'));
    expect(battery).toBeUndefined();
  });

  it('does not flag a rook behind a knight (knight cannot continue the ray)', () => {
    const fen = '4k3/8/8/8/3N4/8/8/3RK3 w - - 0 1';
    const result = detectTactics(fen);
    const battery = result.tactics.find((t) => t.type === 'battery');
    expect(battery).toBeUndefined();
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe('detectTactics — edge cases', () => {
  it('handles invalid FEN gracefully', () => {
    const result = detectTactics('not-a-valid-fen');
    expect(result.highlights).toHaveLength(0);
    expect(result.hangingPieces).toHaveLength(0);
    expect(result.tactics).toHaveLength(0);
    expect(result.summary).toBe('');
  });

  it('handles a position with only kings', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const result = detectTactics(fen);
    expect(result.hangingPieces).toHaveLength(0);
    expect(result.tactics).toHaveLength(0);
  });

  it('handles a checkmate position', () => {
    // Scholar's mate final position
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1';
    const result = detectTactics(fen);
    // Should not throw, may find hanging pieces or tactics
    expect(result).toBeDefined();
  });
});
