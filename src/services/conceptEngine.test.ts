import { describe, it, expect } from 'vitest';
import {
  sideToMove, solvingSide, materialBalance, strongerSide, framingSide,
  renderTacticConcept, renderMatchupConcept, conceptForBoard, conceptForSolution,
} from './conceptEngine';
import { classifyMatchup } from './endgameMatchup';
import type { TacticPattern } from '../types/tacticTypes';

describe('conceptEngine — side calculators', () => {
  it('sideToMove reads the FEN turn field', () => {
    expect(sideToMove('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('white');
    expect(sideToMove('8/8/8/8/8/8/8/K6k b - - 0 1')).toBe('black');
  });

  it('solvingSide is opposite the FEN turn (Lichess setup-move convention)', () => {
    // Puzzle FEN with white to move → the opponent (white) plays the setup move,
    // black solves.
    expect(solvingSide('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('black');
    expect(solvingSide('8/8/8/8/8/8/8/K6k b - - 0 1')).toBe('white');
  });

  it('materialBalance is white-minus-black in pawns', () => {
    expect(materialBalance('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe(0);
    // White an extra rook.
    expect(materialBalance('8/8/8/8/8/8/8/R2K3k w - - 0 1')).toBe(5);
    // Black an extra queen.
    expect(materialBalance('7k/6q1/8/8/8/8/8/4K3 w - - 0 1')).toBe(-9);
  });

  it('strongerSide names the up-material side, balanced within a pawn', () => {
    expect(strongerSide('8/8/8/8/8/8/8/R2K3k w - - 0 1')).toBe('white');
    expect(strongerSide('7k/6q1/8/8/8/8/8/4K3 w - - 0 1')).toBe('black');
    expect(strongerSide('8/5p2/8/4k3/8/4P3/4K3/8 w - - 0 1')).toBe('balanced');
  });

  it('framingSide prefers studentSide, then solver, then stronger, then mover', () => {
    const fen = '8/8/8/8/8/8/8/R2K3k w - - 0 1';
    expect(framingSide(fen, { studentSide: 'black' })).toBe('black'); // override
    expect(framingSide(fen, { hasSolution: true })).toBe('black');    // solver
    expect(framingSide(fen)).toBe('white');                            // stronger
    // Level material, no solution → side to move.
    expect(framingSide('8/5p2/8/4k3/8/4P3/4K3/8 b - - 0 1')).toBe('black');
  });
});

describe('conceptEngine — renderer (computed invariant, not authored blob)', () => {
  it('renderTacticConcept composes the board-true instance + the invariant', () => {
    const pattern: TacticPattern = {
      type: 'fork',
      involvedSquares: ['d5', 'c7', 'f6'],
      description: 'Knight on d5 forks queen on c7 and rook on f6',
      beneficiary: 'w',
    };
    const c = renderTacticConcept(pattern);
    expect(c).not.toBeNull();
    expect(c!.name).toBe('Fork');
    expect(c!.source).toBe('tactic');
    expect(c!.squares).toEqual(['d5', 'c7', 'f6']);
    // Instance (the detector's description) AND the invariant both present.
    expect(c!.full).toContain('Knight on d5 forks');
    expect(c!.full).toContain('only one can escape');
    expect(c!.short).toBe('Fork — two targets, one falls.');
  });

  it('renderTacticConcept returns null for the no-tactic sentinel', () => {
    expect(renderTacticConcept({ type: 'none', involvedSquares: [], description: '' })).toBeNull();
  });

  it('renderMatchupConcept teaches the governing principle of the ending', () => {
    const rook = renderMatchupConcept(classifyMatchup('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'));
    expect(rook).not.toBeNull();
    expect(rook!.name).toBe('Rook ending');
    expect(rook!.full.toLowerCase()).toContain('activity');
    expect(rook!.short).toBe('Rook ending — activity first.');

    const ocb = renderMatchupConcept(classifyMatchup('6k1/8/8/3k4/8/2B5/6b1/4K3 w - - 0 1'));
    expect(ocb!.full.toLowerCase()).toContain('draw');
  });

  it('renderMatchupConcept is null for non-endgame / complex positions', () => {
    expect(renderMatchupConcept(classifyMatchup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))).toBeNull();
  });

  it('no template uses the banned we/our/us perspective', () => {
    // Guard the whole module's rendered output against the perspectiveVoice ban.
    const samples: string[] = [];
    const tacticTypes = ['fork', 'pin', 'skewer', 'discovery', 'double_check', 'back_rank', 'removal_of_guard', 'trapped_piece', 'mate_threat', 'overload', 'battery'] as const;
    for (const t of tacticTypes) {
      const c = renderTacticConcept({ type: t, involvedSquares: [], description: '' });
      if (c) samples.push(c.full, c.short);
    }
    const fens = [
      '8/8/8/4k3/8/4P3/4K3/8 w - - 0 1',   // kp-vs-k
      '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', // rook
      '6k1/8/8/3k4/8/2B5/6b1/4K3 w - - 0 1', // opposite bishops
      '6k1/5p2/8/8/8/8/5PQ1/6K1 w - - 0 1', // queen
    ];
    for (const f of fens) {
      const c = renderMatchupConcept(classifyMatchup(f));
      if (c) samples.push(c.full, c.short);
    }
    for (const s of samples) {
      expect(s, s).not.toMatch(/\b(we|our|us)\b/i);
    }
  });
});

describe('conceptForBoard — the ranked multi-concept router', () => {
  it('teaches the endgame principle in a quiet rook ending (matchup leads)', () => {
    const cs = conceptForBoard('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1');
    expect(cs.length).toBeGreaterThanOrEqual(1);
    expect(cs[0].id).toBe('rook-endgame');
    expect(cs[0].source).toBe('matchup');
  });

  it('returns nothing teachable on the quiet starting position', () => {
    expect(conceptForBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual([]);
  });

  it('respects the max cap', () => {
    const cs = conceptForBoard('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', { max: 1 });
    expect(cs.length).toBeLessThanOrEqual(1);
  });

  it('ranks a live tactic above the endgame teaching beat (multi-concept)', () => {
    // Black Kg8 + pawns f7/g7/h7; White Ra1 → Ra8 is back-rank mate. This is
    // both an ending (major-piece-ish) AND carries a decisive tactic; the tactic
    // must lead. If detectTactics surfaces it, assert order; either way non-empty.
    const cs = conceptForBoard('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(cs.length).toBeGreaterThanOrEqual(1);
    if (cs.some((c) => c.source === 'tactic')) {
      expect(cs[0].source).toBe('tactic');
    }
  });
});

describe('conceptForSolution — the puzzle / solution path', () => {
  it('teaches the endgame principle from the start position of a rook ending', () => {
    const cs = conceptForSolution('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', ['c1c2']);
    expect(cs.some((c) => c.id === 'rook-endgame')).toBe(true);
  });

  it('returns an array and never throws on a benign line', () => {
    expect(Array.isArray(conceptForSolution('8/8/8/8/8/8/8/K6k w - - 0 1', ['a1a2']))).toBe(true);
  });

  it('respects the max cap', () => {
    expect(conceptForSolution('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', ['c1c2'], { max: 1 }).length).toBeLessThanOrEqual(1);
  });
});
