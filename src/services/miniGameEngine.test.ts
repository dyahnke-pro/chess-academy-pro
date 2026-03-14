import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkWinCondition,
  computeAttackedSquares,
  computeSafeSquares,
  computeHighlights,
  getAiMove,
  getBestPlayerMove,
  getHintArrows,
  computeStars,
  getTargetPawnSquare,
} from './miniGameEngine';
import type { MiniGameAiConfig } from '../types';

// ─── Test FENs ──────────────────────────────────────────────────────────────

const STANDARD_PAWN_WARS = '7k/pppppppp/8/8/8/8/PPPPPPPP/K7 w - - 0 1';
const BLOCKER_FEN = '7k/8/2pppp2/8/8/2PPPP2/8/K7 w - - 0 1';
const WHITE_ABOUT_TO_PROMOTE = '7k/4P3/8/8/8/8/8/K7 w - - 0 1';
const BLACK_ABOUT_TO_PROMOTE = '7k/8/8/8/8/8/4p3/K7 b - - 0 1';
const NO_WHITE_PAWNS = '7k/pppppppp/8/8/8/8/8/K7 b - - 0 1';
// Single white pawn blocked by single black pawn, no captures possible
const WHITE_PAWN_BLOCKED = '7k/4p3/4P3/8/8/8/8/K7 w - - 0 1';

// ─── Default AI config ──────────────────────────────────────────────────────

const DEFAULT_AI_CONFIG: MiniGameAiConfig = {
  bestMoveChance: 1.0,
  blocksAdvancedPawn: false,
  prioritizesAdvancement: false,
};

// ─── checkWinCondition ──────────────────────────────────────────────────────

describe('checkWinCondition', () => {
  it('detects white promotion via SAN containing =', () => {
    const result = checkWinCondition(STANDARD_PAWN_WARS, 'e8=Q', 'w');
    expect(result).toBe('w');
  });

  it('detects black promotion via SAN containing =', () => {
    const result = checkWinCondition(STANDARD_PAWN_WARS, 'e1=Q', 'b');
    expect(result).toBe('b');
  });

  it('returns b when white has no pawns', () => {
    const result = checkWinCondition(NO_WHITE_PAWNS, null, null);
    expect(result).toBe('b');
  });

  it('returns b when white has no legal pawn moves (blocked)', () => {
    // White pawn on e6 blocked by black pawn on e7, no captures possible
    const result = checkWinCondition(WHITE_PAWN_BLOCKED, null, null);
    expect(result).toBe('b');
  });

  it('returns null for an ongoing game', () => {
    const result = checkWinCondition(STANDARD_PAWN_WARS, null, null);
    expect(result).toBeNull();
  });

  it('returns null when SAN does not contain promotion', () => {
    const result = checkWinCondition(STANDARD_PAWN_WARS, 'e4', 'w');
    expect(result).toBeNull();
  });
});

// ─── computeAttackedSquares ─────────────────────────────────────────────────

describe('computeAttackedSquares', () => {
  it('computes white pawn diagonal attacks', () => {
    // White pawns on rank 2 attack rank 3 diagonally
    const attacked = computeAttackedSquares(STANDARD_PAWN_WARS, 'w');
    // a2 attacks b3 only (a file, no left diagonal)
    expect(attacked).toContain('b3');
    // e2 attacks d3 and f3
    expect(attacked).toContain('d3');
    expect(attacked).toContain('f3');
  });

  it('computes black pawn diagonal attacks', () => {
    const attacked = computeAttackedSquares(STANDARD_PAWN_WARS, 'b');
    // Black pawns on rank 7 attack rank 6 diagonally
    expect(attacked).toContain('b6');
    expect(attacked).toContain('f6');
  });

  it('handles edge file pawns correctly (a-file has no left diagonal)', () => {
    const attacked = computeAttackedSquares(STANDARD_PAWN_WARS, 'w');
    // a2 pawn can only attack b3 (no left diagonal from a-file)
    expect(attacked).toContain('b3');
    // There should be no attack on a non-existent square left of a-file
    const hasInvalidSquare = attacked.some(
      (sq) => sq.charCodeAt(0) < 'a'.charCodeAt(0),
    );
    expect(hasInvalidSquare).toBe(false);
  });

  it('handles edge file pawns correctly (h-file has no right diagonal)', () => {
    const attacked = computeAttackedSquares(STANDARD_PAWN_WARS, 'w');
    // h2 pawn can only attack g3 (no right diagonal from h-file)
    expect(attacked).toContain('g3');
    const hasInvalidSquare = attacked.some(
      (sq) => sq.charCodeAt(0) > 'h'.charCodeAt(0),
    );
    expect(hasInvalidSquare).toBe(false);
  });

  it('returns empty array when no pawns of the given color exist', () => {
    const attacked = computeAttackedSquares(NO_WHITE_PAWNS, 'w');
    expect(attacked).toEqual([]);
  });
});

// ─── computeSafeSquares ─────────────────────────────────────────────────────

describe('computeSafeSquares', () => {
  it('returns legal pawn destinations not under attack', () => {
    const safe = computeSafeSquares(STANDARD_PAWN_WARS, 'w');
    // Legal pawn moves for white: any pawn can go 1 or 2 squares forward
    // Black pawns on rank 7 attack rank 6 diagonally — but white moves to rank 3/4, not 6
    // So all moves should be safe in the starting position
    expect(safe.length).toBeGreaterThan(0);
    // Rank 3 and 4 moves should all be safe (black attacks rank 6)
    for (const sq of safe) {
      const rank = parseInt(sq[1]);
      expect(rank).toBeGreaterThanOrEqual(3);
      expect(rank).toBeLessThanOrEqual(4);
    }
  });

  it('returns empty when all destinations are under attack', () => {
    // Position where white has one pawn and both forward diagonals are attacked
    // White pawn on e3, black pawns on d4 and f4 => e4 is attacked by both
    const fen = '7k/8/8/8/3p1p2/4P3/8/K7 w - - 0 1';
    const safe = computeSafeSquares(fen, 'w');
    // e3 can go to e4 — is e4 attacked by d4 and f4 diagonally?
    // d4 attacks c3 and e3, f4 attacks e3 and g3 (black pawns attack DOWN)
    // e4 is NOT attacked by d4/f4 (they attack rank 3, not rank 4)
    // Let's use a position where pawn destinations ARE attacked
    // White pawn on e5, black pawns on d7 and f7 -> they attack d6/e6 and e6/f6
    const fen2 = '7k/3p1p2/8/4P3/8/8/8/K7 w - - 0 1';
    const safe2 = computeSafeSquares(fen2, 'w');
    // e5 can go to e6 — is e6 attacked by d7 (attacks c6, e6) and f7 (attacks e6, g6)? Yes!
    expect(safe2).not.toContain('e6');
    expect(safe2).toEqual([]);
  });
});

// ─── computeHighlights ──────────────────────────────────────────────────────

describe('computeHighlights', () => {
  it('returns both danger and safe squares in "all" mode', () => {
    const result = computeHighlights(STANDARD_PAWN_WARS, 'w', 'all');
    expect(result.dangerSquares.length).toBeGreaterThan(0);
    expect(result.safeSquares.length).toBeGreaterThan(0);
  });

  it('returns only danger squares in "danger" mode', () => {
    const result = computeHighlights(STANDARD_PAWN_WARS, 'w', 'danger');
    expect(result.dangerSquares.length).toBeGreaterThan(0);
    expect(result.safeSquares).toEqual([]);
  });

  it('returns empty arrays in "none" mode', () => {
    const result = computeHighlights(STANDARD_PAWN_WARS, 'w', 'none');
    expect(result.dangerSquares).toEqual([]);
    expect(result.safeSquares).toEqual([]);
  });
});

// ─── getAiMove ──────────────────────────────────────────────────────────────

describe('getAiMove', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a valid pawn move in standard position', () => {
    const move = getAiMove(STANDARD_PAWN_WARS, DEFAULT_AI_CONFIG, 'pawn-wars');
    expect(move).not.toBeNull();
    // Move should be a UCI string (e.g. "e2e4")
    expect(move!.length).toBeGreaterThanOrEqual(4);
  });

  it('returns null when no legal pawn moves exist', () => {
    const move = getAiMove(WHITE_PAWN_BLOCKED, DEFAULT_AI_CONFIG, 'pawn-wars');
    expect(move).toBeNull();
  });

  it('respects targetPawnFile in blocker mode', () => {
    const aiConfig: MiniGameAiConfig = {
      bestMoveChance: 1.0,
      blocksAdvancedPawn: false,
      prioritizesAdvancement: false,
      targetPawnFile: 'e',
    };
    // Blocker FEN: black pawns on c6,d6,e6,f6 — it's white's turn
    // Switch to black's turn for the AI to use target pawn
    const blackToMoveFen = '7k/8/2pppp2/8/8/2PPPP2/8/K7 b - - 0 1';
    const move = getAiMove(blackToMoveFen, aiConfig, 'blocker');
    expect(move).not.toBeNull();
    // With targetPawnFile 'e' and high score bonus, the e6 pawn should be selected
    expect(move!.startsWith('e6')).toBe(true);
  });

  it('always returns a move when pawn moves are available', () => {
    // Run several times to account for randomness
    for (let i = 0; i < 5; i++) {
      const move = getAiMove(
        STANDARD_PAWN_WARS,
        DEFAULT_AI_CONFIG,
        'pawn-wars',
      );
      expect(move).not.toBeNull();
    }
  });

  it('includes promotion suffix when promoting', () => {
    // White pawn on e7 about to promote — white to move
    const move = getAiMove(
      WHITE_ABOUT_TO_PROMOTE,
      DEFAULT_AI_CONFIG,
      'pawn-wars',
    );
    expect(move).not.toBeNull();
    // Should include promotion piece (e.g. "e7e8q")
    expect(move!).toMatch(/e7e8/);
  });
});

// ─── getBestPlayerMove ──────────────────────────────────────────────────────

describe('getBestPlayerMove', () => {
  it('returns a move when it is the player turn', () => {
    const move = getBestPlayerMove(STANDARD_PAWN_WARS, 'w');
    expect(move).not.toBeNull();
    expect(move!.from).toBeDefined();
    expect(move!.to).toBeDefined();
  });

  it('returns null when it is not the player turn', () => {
    // Standard pawn wars is white's turn, so asking for black should return null
    const move = getBestPlayerMove(STANDARD_PAWN_WARS, 'b');
    expect(move).toBeNull();
  });

  it('returns null when no legal pawn moves exist', () => {
    const move = getBestPlayerMove(WHITE_PAWN_BLOCKED, 'w');
    expect(move).toBeNull();
  });
});

// ─── getHintArrows ──────────────────────────────────────────────────────────

describe('getHintArrows', () => {
  it('returns empty array for hintLevel 0', () => {
    const arrows = getHintArrows(STANDARD_PAWN_WARS, 'w', 0);
    expect(arrows).toEqual([]);
  });

  it('returns red arrows for hintLevel 1 (opponent attack lines)', () => {
    const arrows = getHintArrows(STANDARD_PAWN_WARS, 'w', 1);
    expect(arrows.length).toBeGreaterThan(0);
    // All arrows should be red (opponent attack lines)
    for (const arrow of arrows) {
      expect(arrow.color).toContain('239, 68, 68'); // red color
    }
  });

  it('returns red arrows plus a green arrow for hintLevel 2', () => {
    const arrows = getHintArrows(STANDARD_PAWN_WARS, 'w', 2);
    const redArrows = arrows.filter((a) => a.color.includes('239, 68, 68'));
    const greenArrows = arrows.filter((a) => a.color.includes('34, 197, 94'));
    expect(redArrows.length).toBeGreaterThan(0);
    expect(greenArrows.length).toBe(1);
  });

  it('returns empty array for negative hintLevel', () => {
    const arrows = getHintArrows(STANDARD_PAWN_WARS, 'w', -1);
    expect(arrows).toEqual([]);
  });
});

// ─── computeStars ───────────────────────────────────────────────────────────

describe('computeStars', () => {
  it('returns 3 stars for 0 hints and 0 extra moves on level 3', () => {
    expect(computeStars(0, 0, 3)).toBe(3);
  });

  it('returns 3 stars for 0 hints and 2 extra moves on level 3', () => {
    expect(computeStars(0, 2, 3)).toBe(3);
  });

  it('returns 2 stars for 1 hint and 3 extra moves on level 3', () => {
    expect(computeStars(1, 3, 3)).toBe(2);
  });

  it('returns 1 star for many hints and extra moves on level 3', () => {
    expect(computeStars(5, 10, 3)).toBe(1);
  });

  it('does not penalise hints on level 1', () => {
    // Even with 5 hints, if extraMoves <= 2 => 3 stars (hintPenalty is 0 for level 1)
    expect(computeStars(5, 0, 1)).toBe(3);
  });

  it('does not penalise hints on level 2', () => {
    expect(computeStars(5, 0, 2)).toBe(3);
  });

  it('returns 2 stars for 0 hints and 4 extra moves', () => {
    expect(computeStars(0, 4, 3)).toBe(2);
  });

  it('returns 1 star for 0 hints and 5 extra moves on level 3', () => {
    expect(computeStars(0, 5, 3)).toBe(1);
  });
});

// ─── getTargetPawnSquare ────────────────────────────────────────────────────

describe('getTargetPawnSquare', () => {
  it('finds the target pawn on the specified file', () => {
    // BLOCKER_FEN has black pawns on c6, d6, e6, f6
    const square = getTargetPawnSquare(BLOCKER_FEN, 'b', 'e');
    expect(square).toBe('e6');
  });

  it('returns null when targetPawnFile is undefined', () => {
    const square = getTargetPawnSquare(BLOCKER_FEN, 'b', undefined);
    expect(square).toBeNull();
  });

  it('returns null when no pawn exists on the target file', () => {
    // BLOCKER_FEN has no black pawn on a-file
    const square = getTargetPawnSquare(BLOCKER_FEN, 'b', 'a');
    expect(square).toBeNull();
  });
});
