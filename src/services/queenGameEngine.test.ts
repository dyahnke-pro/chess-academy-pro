import { describe, it, expect } from 'vitest';
import {
  getQueenMoves,
  getAttackedSquares,
  QUEEN_ARMY_LEVELS,
  initQueenArmyState,
  processQueenArmyMove,
  queenArmyPosition,
  queenArmyHighlights,
  QUEEN_GAUNTLET_LEVELS,
  initGauntletState,
  processGauntletMove,
  gauntletPosition,
  gauntletHighlights,
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

// ─── Queen's Gauntlet ────────────────────────────────────────────────────────

describe("Queen's Gauntlet", () => {
  describe('level configs', () => {
    it('has 3 levels defined', () => {
      expect(QUEEN_GAUNTLET_LEVELS).toHaveLength(3);
    });

    it('level 1 has 2 enemies with safe+attacked highlights', () => {
      expect(QUEEN_GAUNTLET_LEVELS[0].enemies).toHaveLength(2);
      expect(QUEEN_GAUNTLET_LEVELS[0].showAttackedSquares).toBe(true);
      expect(QUEEN_GAUNTLET_LEVELS[0].showSafeSquares).toBe(true);
    });

    it('level 2 has 4 enemies, attacked only', () => {
      expect(QUEEN_GAUNTLET_LEVELS[1].enemies).toHaveLength(4);
      expect(QUEEN_GAUNTLET_LEVELS[1].showAttackedSquares).toBe(true);
      expect(QUEEN_GAUNTLET_LEVELS[1].showSafeSquares).toBe(false);
    });

    it('level 3 has 6 enemies, no highlights', () => {
      expect(QUEEN_GAUNTLET_LEVELS[2].enemies).toHaveLength(6);
      expect(QUEEN_GAUNTLET_LEVELS[2].showAttackedSquares).toBe(false);
      expect(QUEEN_GAUNTLET_LEVELS[2].showSafeSquares).toBe(false);
    });
  });

  describe('initGauntletState', () => {
    it('initializes correctly for level 1', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      expect(state.queen).toBe('a1');
      expect(state.target).toBe('h8');
      expect(state.enemies).toHaveLength(2);
      expect(state.status).toBe('playing');
      expect(state.moveCount).toBe(0);
    });
  });

  describe('processGauntletMove', () => {
    it('moves queen to a safe square', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      // a1 → a2 (check if safe)
      // Enemies: rook d4, bishop f5
      // a2 is not attacked by rook on d4 (different file and rank)
      // a2 is not attacked by bishop on f5 (different diagonal)
      const newState = processGauntletMove(state, 'a2');
      expect(newState.status).toBe('playing');
      expect(newState.queen).toBe('a2');
      expect(newState.moveCount).toBe(1);
    });

    it('loses when landing on attacked square', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      // Rook on d4 attacks entire 4th rank and d-file
      // Moving to d1 — is that attacked? d1 is on the d-file, so yes (rook on d4 attacks d1)
      const newState = processGauntletMove(state, 'd1');
      expect(newState.status).toBe('lost');
    });

    it('wins when reaching the target', () => {
      // Construct a state near the target
      const level = QUEEN_GAUNTLET_LEVELS[0];
      const state = {
        queen: 'h7',
        enemies: level.enemies,
        target: 'h8',
        status: 'playing' as const,
        moveCount: 3,
      };
      // h8 — check if safe. Rook d4 attacks d8 not h8 (yes it does via 4th rank, no h8 is not on 4th rank)
      // Rook d4 attacks: d-file (d1-d8) and 4th rank (a4-h4). h8 is NOT on either.
      // Bishop f5 attacks diagonals: e6,d7,c8 and g6,h7 and e4,d3,c2,b1 and g4,h3. h8 is not on any.
      // Wait, bishop f5 diagonal: f5→g6→h7. So h7 IS attacked, meaning queen at h7 would be on an attacked square.
      // But h8: f5→g6→h7 stops at h7 (blocked if queen is there). Not h8.
      // Actually let me check: bishop f5 upper-right diagonal goes f5,g6,h7. With queen on h7, h7 is a blocker so bishop can't go past.
      // h8 is safe from bishop f5.
      // So h8 should be safe.
      const newState = processGauntletMove(state, 'h8');
      expect(newState.status).toBe('won');
    });

    it('rejects invalid queen moves', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      // a1 to b3 is not a valid queen move
      const result = processGauntletMove(state, 'b3');
      expect(result).toBe(state);
    });

    it('does not allow moving to enemy-occupied squares', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      // Try to move to d4 where rook is (even though queen could move there diagonally from a1)
      // The queen can't capture in gauntlet
      const result = processGauntletMove(state, 'd4');
      expect(result).toBe(state);
    });

    it('does not process moves when game is over', () => {
      const state = {
        queen: 'h8',
        enemies: QUEEN_GAUNTLET_LEVELS[0].enemies,
        target: 'h8',
        status: 'won' as const,
        moveCount: 4,
      };
      const result = processGauntletMove(state, 'h7');
      expect(result).toBe(state);
    });
  });

  describe('gauntletPosition', () => {
    it('returns a FEN string with queen and enemies', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      const pos = gauntletPosition(state);
      expect(pos[state.queen]).toEqual({ pieceType: 'wQ' });
      for (const e of state.enemies) {
        const expected = e.type === 'rook' ? 'bR' : 'bB';
        expect(pos[e.square]).toEqual({ pieceType: expected });
      }
    });
  });

  describe('gauntletHighlights', () => {
    it('returns attacked and safe squares for level 1', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[0]);
      const hl = gauntletHighlights(state, QUEEN_GAUNTLET_LEVELS[0]);
      expect(hl.attackedSquares.size).toBeGreaterThan(0);
      expect(hl.safeSquares.size).toBeGreaterThan(0);
      // d1 should be attacked (rook on d4)
      expect(hl.attackedSquares.has('d1')).toBe(true);
    });

    it('returns no highlights for level 3', () => {
      const state = initGauntletState(QUEEN_GAUNTLET_LEVELS[2]);
      const hl = gauntletHighlights(state, QUEEN_GAUNTLET_LEVELS[2]);
      expect(hl.attackedSquares.size).toBe(0);
      expect(hl.safeSquares.size).toBe(0);
    });
  });
});
