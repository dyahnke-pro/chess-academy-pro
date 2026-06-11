import { describe, it, expect } from 'vitest';
import {
  getQueenMoves,
  getAttackedSquares,
  QUEEN_ARMY_LEVELS,
  initQueenArmyState,
  processQueenArmyMove,
  queenArmyPosition,
  queenArmyHighlights,
} from './queenGameEngine';

// ─── getQueenMoves ───────────────────────────────────────────────────────────

describe('getQueenMoves', () => {
  it('returns all 27 squares from the center on an empty board', () => {
    const moves = getQueenMoves('d4', [{ type: 'queen', square: 'd4' }]);
    // d-file: d1,d2,d3,d5,d6,d7,d8 = 7
    // 4th rank: a4,b4,c4,e4,f4,g4,h4 = 7
    // diagonals from d4: a1,b2,c3,e5,f6,g7,h8,a7,b6,c5,e3,f2,g1 = 13
    expect(moves.length).toBe(27);
    expect(moves).toContain('a1');
    expect(moves).toContain('h8');
    expect(moves).toContain('a7');
    expect(moves).toContain('g1');
    expect(moves).toContain('d8');
    expect(moves).toContain('h4');
  });

  it('is blocked by pieces in the way', () => {
    const pieces = [
      { type: 'queen' as const, square: 'a1' },
      { type: 'pawn' as const, square: 'a3' },
      { type: 'pawn' as const, square: 'c3' },
    ];
    const moves = getQueenMoves('a1', pieces);
    // up the a-file: a2, a3 (capture) — blocked after a3
    expect(moves).toContain('a2');
    expect(moves).toContain('a3'); // can capture
    expect(moves).not.toContain('a4'); // blocked
    // diagonal: b2, c3 (capture) — blocked after c3
    expect(moves).toContain('b2');
    expect(moves).toContain('c3'); // can capture
    expect(moves).not.toContain('d4'); // blocked
  });

  it('cannot move through friendly pieces', () => {
    const pieces = [
      { type: 'queen' as const, square: 'd4' },
    ];
    const friendlySquares = new Set(['d6']);
    const moves = getQueenMoves('d4', pieces, friendlySquares);
    expect(moves).toContain('d5');
    expect(moves).not.toContain('d6'); // friendly
    expect(moves).not.toContain('d7'); // blocked by friendly
  });
});

// ─── getAttackedSquares ──────────────────────────────────────────────────────

describe('getAttackedSquares', () => {
  it('computes rook attacks correctly', () => {
    const enemies = [{ type: 'rook' as const, square: 'd4' }];
    const blockers = new Set(['d4']);
    const attacked = getAttackedSquares(enemies, blockers);
    expect(attacked.has('d1')).toBe(true);
    expect(attacked.has('d8')).toBe(true);
    expect(attacked.has('a4')).toBe(true);
    expect(attacked.has('h4')).toBe(true);
    expect(attacked.has('e5')).toBe(false); // diagonal
  });

  it('computes bishop attacks correctly', () => {
    const enemies = [{ type: 'bishop' as const, square: 'd4' }];
    const blockers = new Set(['d4']);
    const attacked = getAttackedSquares(enemies, blockers);
    expect(attacked.has('a1')).toBe(true);
    expect(attacked.has('h8')).toBe(true);
    expect(attacked.has('a7')).toBe(true);
    expect(attacked.has('g1')).toBe(true);
    expect(attacked.has('d5')).toBe(false); // file
  });

  it('computes knight attacks correctly', () => {
    const enemies = [{ type: 'knight' as const, square: 'd4' }];
    const blockers = new Set(['d4']);
    const attacked = getAttackedSquares(enemies, blockers);
    expect(attacked.has('c2')).toBe(true);
    expect(attacked.has('e2')).toBe(true);
    expect(attacked.has('b3')).toBe(true);
    expect(attacked.has('f3')).toBe(true);
    expect(attacked.has('b5')).toBe(true);
    expect(attacked.has('f5')).toBe(true);
    expect(attacked.has('c6')).toBe(true);
    expect(attacked.has('e6')).toBe(true);
    expect(attacked.size).toBe(8);
  });

  it('rook attacks are blocked by other pieces', () => {
    const enemies = [{ type: 'rook' as const, square: 'a1' }];
    const blockers = new Set(['a1', 'a3']);
    const attacked = getAttackedSquares(enemies, blockers);
    expect(attacked.has('a2')).toBe(true);
    expect(attacked.has('a3')).toBe(true); // includes blocker square
    expect(attacked.has('a4')).toBe(false); // blocked
  });

  it('combines attacks from multiple pieces', () => {
    const enemies = [
      { type: 'rook' as const, square: 'a1' },
      { type: 'bishop' as const, square: 'h1' },
    ];
    const blockers = new Set(['a1', 'h1']);
    const attacked = getAttackedSquares(enemies, blockers);
    // rook on a1 attacks a-file and 1st rank
    expect(attacked.has('a8')).toBe(true);
    expect(attacked.has('h1')).toBe(true);
    // bishop on h1 attacks h1-a8 diagonal
    expect(attacked.has('g2')).toBe(true);
    expect(attacked.has('a8')).toBe(true);
  });
});

// ─── Queen vs Army ───────────────────────────────────────────────────────────

describe('Queen vs Army', () => {
  describe('level configs', () => {
    it('has 3 levels defined', () => {
      expect(QUEEN_ARMY_LEVELS).toHaveLength(3);
    });

    it('level 1 has 6 pawns and no knight', () => {
      expect(QUEEN_ARMY_LEVELS[0].pawns).toHaveLength(6);
      expect(QUEEN_ARMY_LEVELS[0].knight).toBeNull();
    });

    it('level 2 has 8 pawns', () => {
      expect(QUEEN_ARMY_LEVELS[1].pawns).toHaveLength(8);
    });

    it('level 3 has 10 pawns and a knight', () => {
      expect(QUEEN_ARMY_LEVELS[2].pawns).toHaveLength(10);
      expect(QUEEN_ARMY_LEVELS[2].knight).not.toBeNull();
    });

    it('level 1 shows promotion highlight and queen moves', () => {
      expect(QUEEN_ARMY_LEVELS[0].showPromotionHighlight).toBe(true);
      expect(QUEEN_ARMY_LEVELS[0].showQueenMoves).toBe(true);
    });

    it('level 3 shows no highlights', () => {
      expect(QUEEN_ARMY_LEVELS[2].showPromotionHighlight).toBe(false);
      expect(QUEEN_ARMY_LEVELS[2].showQueenMoves).toBe(false);
    });
  });

  describe('initQueenArmyState', () => {
    it('initializes correctly for level 1', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[0]);
      expect(state.queen).toBe('d5');
      expect(state.pawns).toHaveLength(6);
      expect(state.knight).toBeNull();
      expect(state.status).toBe('playing');
      expect(state.moveCount).toBe(0);
    });
  });

  describe('processQueenArmyMove', () => {
    it('captures a pawn when queen moves to its square', () => {
      const level = QUEEN_ARMY_LEVELS[0];
      const state = initQueenArmyState(level);
      // Queen on d5 can capture d2 (straight down the d-file, path clear)
      // Level 1 pawns: b2, d2, f2, c3, e3, g4
      const newState = processQueenArmyMove(state, 'd2');
      expect(newState.status).toBe('playing');
      // d2 pawn captured → 5 pawns left (they also advance one rank)
      expect(newState.pawns).toHaveLength(5);
      expect(newState.moveCount).toBe(1);
    });

    it('rejects invalid queen moves', () => {
      const level = QUEEN_ARMY_LEVELS[0];
      const state = initQueenArmyState(level);
      // d5 to c3 is not a valid queen move (knight-like)
      const result = processQueenArmyMove(state, 'c3');
      expect(result).toBe(state); // unchanged
    });

    it('advances pawns after queen move', () => {
      const level = QUEEN_ARMY_LEVELS[0];
      const state = initQueenArmyState(level);
      // Queen at d5, move to d8 (valid, straight up)
      const newState = processQueenArmyMove(state, 'd8');
      expect(newState.status).toBe('playing');
      // All 6 pawns should have advanced one rank
      for (const pawnSq of newState.pawns) {
        const rank = parseInt(pawnSq[1], 10);
        // Original ranks were 2,2,2,3,3,4 → should be 3,3,3,4,4,5
        expect(rank).toBeGreaterThanOrEqual(3);
      }
    });

    it('wins when all pawns are captured', () => {
      // Set up a minimal state with one pawn
      const state = {
        queen: 'a1',
        pawns: ['a2'],
        knight: null,
        status: 'playing' as const,
        moveCount: 5,
      };
      const result = processQueenArmyMove(state, 'a2');
      expect(result.status).toBe('won');
      expect(result.pawns).toHaveLength(0);
    });

    it('loses when a pawn reaches rank 8', () => {
      // Pawn on rank 7 — after queen move it advances to rank 8
      const state = {
        queen: 'a1',
        pawns: ['c7', 'e3'],
        knight: null,
        status: 'playing' as const,
        moveCount: 3,
      };
      // Move queen somewhere valid that doesn't capture a pawn
      const result = processQueenArmyMove(state, 'b1');
      expect(result.status).toBe('lost');
    });

    it('does not process moves when game is over', () => {
      const state = {
        queen: 'a1',
        pawns: [],
        knight: null,
        status: 'won' as const,
        moveCount: 5,
      };
      const result = processQueenArmyMove(state, 'a2');
      expect(result).toBe(state);
    });

    it('queen can capture the knight in level 3', () => {
      // Construct a state where queen can capture knight along a file
      const customState = {
        queen: 'g4',
        pawns: ['a2'],
        knight: 'g6' as string | null,
        status: 'playing' as const,
        moveCount: 2,
      };
      const result = processQueenArmyMove(customState, 'g6');
      expect(result.knight).toBeNull();
      expect(result.status).toBe('playing');
    });
  });

  describe('queenArmyPosition', () => {
    it('returns a position object with queen and pawns', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[0]);
      const pos = queenArmyPosition(state);
      expect(pos[state.queen]).toEqual({ pieceType: 'wQ' });
      for (const p of state.pawns) {
        expect(pos[p]).toEqual({ pieceType: 'bP' });
      }
    });

    it('includes knight for level 3', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[2]);
      const pos = queenArmyPosition(state);
      if (state.knight === null) throw new Error('Expected knight to be non-null for level 3');
      expect(pos[state.knight]).toEqual({ pieceType: 'bN' });
    });
  });

  describe('queenArmyHighlights', () => {
    it('returns promotion squares for level 1', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[0]);
      const hl = queenArmyHighlights(state, QUEEN_ARMY_LEVELS[0]);
      expect(hl.promotionSquares).toHaveLength(8);
      expect(hl.promotionSquares).toContain('a8');
      expect(hl.promotionSquares).toContain('h8');
    });

    it('returns queen move squares for level 1', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[0]);
      const hl = queenArmyHighlights(state, QUEEN_ARMY_LEVELS[0]);
      expect(hl.queenMoveSquares.length).toBeGreaterThan(0);
    });

    it('returns no highlights for level 3', () => {
      const state = initQueenArmyState(QUEEN_ARMY_LEVELS[2]);
      const hl = queenArmyHighlights(state, QUEEN_ARMY_LEVELS[2]);
      expect(hl.promotionSquares).toHaveLength(0);
      expect(hl.queenMoveSquares).toHaveLength(0);
    });
  });
});
