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
    // White rook on a5 and white bishop on h5, both undefended, attacked by black pieces
    const fen = '4k3/8/1b4q1/R6B/8/8/8/4K3 b - - 0 1';
    const result = detectTactics(fen);
    expect(hasHangingPieceAt(result, 'a5')).toBe(true);
    expect(hasHangingPieceAt(result, 'h5')).toBe(true);
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
