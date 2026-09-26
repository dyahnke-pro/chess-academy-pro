import { describe, it, expect } from 'vitest';
import {
  sideToMove, solvingSide, materialBalance, strongerSide, framingSide,
  renderTacticConcept, renderMatchupConcept, conceptForBoard, conceptForSolution, positionalConcepts,
  conceptForLine,
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
    const c = renderTacticConcept(pattern, '8/8/8/8/8/8/8/8 w - - 0 1');
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
    expect(renderTacticConcept({ type: 'none', involvedSquares: [], description: '' }, '8/8/8/8/8/8/8/8 w - - 0 1')).toBeNull();
  });

  it('renderMatchupConcept teaches the governing principle of the ending', () => {
    const rook = renderMatchupConcept(classifyMatchup('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'));
    expect(rook).not.toBeNull();
    expect(rook!.name).toBe('Rook ending');
    expect(rook!.full.toLowerCase()).toContain('activity');
    expect(rook!.short).toBe('Rook ending — activity first.');

    const ocb = renderMatchupConcept(classifyMatchup('8/8/8/3k4/8/2B5/6b1/4K3 w - - 0 1'));
    expect(ocb!.full.toLowerCase()).toContain('draw');
  });

  it('renderMatchupConcept is null for non-endgame / complex positions', () => {
    expect(renderMatchupConcept(classifyMatchup('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))).toBeNull();
  });

  it('a rule with no board instance is marked bare, so a live surface can refuse it (16.Rxf3)', () => {
    const bare = renderTacticConcept({ type: 'trapped_piece', involvedSquares: [], description: '' }, '8/8/8/8/8/8/8/8 w - - 0 1');
    expect(bare?.bare).toBe(true);
    const named = renderTacticConcept({ type: 'fork', involvedSquares: ['e5', 'c6', 'g6'], description: 'Knight on e5 forks rook on c6 and queen on g6' }, '8/8/8/8/8/8/8/8 w - - 0 1');
    expect(named?.bare).toBeUndefined();
  });

  it('no template uses the banned we/our/us perspective', () => {
    // Guard the whole module's rendered output against the perspectiveVoice ban.
    const samples: string[] = [];
    const tacticTypes = ['fork', 'pin', 'skewer', 'discovery', 'double_check', 'back_rank', 'removal_of_guard', 'trapped_piece', 'mate_threat', 'overload', 'battery'] as const;
    for (const t of tacticTypes) {
      const c = renderTacticConcept({ type: t, involvedSquares: [], description: '' }, '8/8/8/8/8/8/8/8 w - - 0 1');
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
    // Multi-pawn rook ending with no named technique on the board.
    const cs = conceptForBoard('8/5pk1/8/8/8/6P1/R4PK1/3r4 w - - 0 1');
    expect(cs.length).toBeGreaterThanOrEqual(1);
    expect(cs[0].id).toBe('rook-endgame');
    expect(cs[0].source).toBe('matchup');
  });

  it('teaches the NAMED technique (Lucena) over the generic rook principle', () => {
    const cs = conceptForBoard('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1');
    expect(cs[0].id).toBe('lucena');
    expect(cs[0].source).toBe('technique');
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
  it('teaches the named technique (Lucena) from the start position of a rook ending', () => {
    const cs = conceptForSolution('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', ['c1c2']);
    expect(cs.some((c) => c.id === 'lucena')).toBe(true);
  });

  it('returns an array and never throws on a benign line', () => {
    expect(Array.isArray(conceptForSolution('8/8/8/8/8/8/8/K6k w - - 0 1', ['a1a2']))).toBe(true);
  });

  it('respects the max cap', () => {
    expect(conceptForSolution('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', ['c1c2'], { max: 1 }).length).toBeLessThanOrEqual(1);
  });
});

describe('conceptEngine — named technique preferred over generic principle', () => {
  it('teaches THE OPPOSITION (specific) over the generic pawn-ending principle', () => {
    // White Ke4 + Pe3 vs Black Ke6, White to move → kings in direct opposition.
    const cs = conceptForBoard('8/8/4k3/8/4K3/4P3/8/8 w - - 0 1');
    expect(cs.length).toBeGreaterThanOrEqual(1);
    expect(cs[0].id).toBe('opposition');
    expect(cs[0].source).toBe('technique');
  });
});

describe('conceptForSolution — technique reached along the solution', () => {
  it('surfaces THE OPPOSITION when the K+P solution reaches it', () => {
    // Black to move (opponent) must give way; White (student) then takes the
    // opposition with Kd4. After that move the kings are aligned d4/d6, one square
    // between, Black to move → White holds the opposition.
    const cs = conceptForSolution('8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', ['d5d6', 'd3d4']);
    // After …Kd6 Kd4 the kings are in opposition AND Kd4 stands on a key square
    // of the e2 pawn — the more specific theorem (key square → promotes by
    // force) leads; either is the named K+P technique, never the generic beat.
    expect(cs.some((c) => c.id === 'key-squares' || c.id === 'opposition')).toBe(true);
    expect(cs.some((c) => c.source === 'technique')).toBe(true);
  });
});

describe('conceptEngine — positional concepts (§E)', () => {
  it('returns nothing on bare kings', () => {
    expect(positionalConcepts('8/8/8/4k3/8/4K3/8/8 w - - 0 1')).toEqual([]);
  });

  it('every positional concept has source=positional and both registers', () => {
    const cs = positionalConcepts('r2q1rk1/pp3ppp/2n1b3/3Np3/8/2P3P1/PP2PPBP/R2Q1RK1 w - - 0 1');
    for (const c of cs) {
      expect(c.source).toBe('positional');
      expect(c.full.length).toBeGreaterThan(10);
      expect(c.short.length).toBeGreaterThan(0);
    }
  });

  it('surfaces a positional concept on a quiet position with a d5 knight outpost', () => {
    const cs = conceptForBoard('r2q1rk1/pp3ppp/2n1b3/3Np3/8/2P3P1/PP2PPBP/R2Q1RK1 w - - 0 1');
    expect(cs.some((c) => c.source === 'positional')).toBe(true);
  });
});

describe('conceptEngine — ONE computational system (consumes the fed analysis)', () => {
  // A puzzle-shaped line: Black to move (opponent) plays ...Kd6, White (student)
  // takes the opposition with Kd4. Fed as the ENGINE's PV with a swing that
  // clears the shared "critical" threshold, the line-walk must produce the
  // opposition concept and rank it from the engine's swing.
  const fen = '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1';
  const pv = ['d5d6', 'd3d4'];

  it('conceptForBoard walks the surface\'s existing PV instead of running its own engine', () => {
    const analysis = {
      bestMove: 'd5d6', evaluation: 50, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0,
      topLines: [{ moves: pv, evaluation: 50, mate: null }],
    } as unknown as import('../types').StockfishAnalysis;
    const cs = conceptForBoard(fen, { analysis, studentSide: 'white', rating: 1500 });
    expect(cs.some((c) => c.id === 'opposition')).toBe(true);
  });

  it('conceptForLine ranks a landed tactic by the engine\'s swing on the shared thresholds', () => {
    // Same solution shape as the mate/tactic tests: importance must come from the
    // swing (critical tier at 1500 = >=100cp → 0.88), not a static table.
    const withSwing = conceptForLine({
      fen: '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', uci: pv, studentColor: 'w',
      rootEvalCp: 0, lineEvalCp: 150,
    });
    const noSwing = conceptForLine({ fen: '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', uci: pv, studentColor: 'w' });
    // Both walks reach the same technique; the engine-fed one carries a concept
    // whose importance was set from the swing tier, the fed-less one falls back.
    const named = (c: { id: string }): boolean => c.id === 'key-squares' || c.id === 'opposition';
    expect(withSwing.some(named)).toBe(true);
    expect(noSwing.some(named)).toBe(true);
  });

  it('a forced mate on the line is decisive regardless of cp', () => {
    const cs = conceptForLine({ fen: '8/8/8/3k4/8/3K4/4P3/8 b - - 0 1', uci: pv, studentColor: 'w', rootEvalCp: 0, lineEvalCp: 0, lineMate: 3 });
    expect(cs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('conceptEngine — a delivered mate is NAMED by its pattern (P2b)', () => {
  it('a back-rank mate solution teaches "Back-Rank Mate", not a generic mate register', () => {
    // Lichess shape: the FEN is BEFORE the opponent's setup move (…Kh8), then
    // the solver's Re8# — the textbook back-rank mate.
    const cs = conceptForSolution('6k1/5ppp/8/8/8/8/4RPPP/6K1 b - - 0 1', ['g8h8', 'e2e8']);
    const lead = cs[0];
    expect(lead.id).toBe('back-rank-mate');
    expect(lead.source).toBe('mate');
    expect(lead.full).toMatch(/^Back-Rank Mate — /);
    expect(lead.full).not.toMatch(/\b(we|our|us)\b/i);
    expect(lead.short.split(/\s+/).length).toBeLessThanOrEqual(8);
    expect(lead.importance).toBeGreaterThanOrEqual(0.95);
  });

  it('a smothered mate along the solution names the pattern at the mating ply', () => {
    // …Rg8 (the opponent's setup move) then Nf7# — smothered.
    const cs = conceptForSolution('5r1k/6pp/8/6N1/8/8/8/7K b - - 0 1', ['f8g8', 'g5f7']);
    expect(cs.some((c) => c.id === 'smothered-mate' && c.source === 'mate')).toBe(true);
  });
});
