import { describe, it, expect } from 'vitest';
import { BUNDLE_ADAPTERS, readEveryComputer, type BoardBundle } from './boardBundle';
import { Chess } from 'chess.js';
import { COMPUTER_CATALOG } from './coachFact';
import { BOARD_COMPUTERS } from './boardComputers';

// Danya's rook-lift board (the-positional-rook-lift #2), Black to move.
const FEN = '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25';
const bundle: BoardBundle = {
  fen: FEN,
  student: 'b',
  lines: [{ moves: ['c8b8', 'f3h4'], cp: 120, mate: null }],
  rating: 1800,
  history: [],
  priorMove: null,
  priorMoveSeat: null,
  priorLines: null,
};

describe('the one bundle every computer reads (fix 1)', () => {
  it('every catalog computer has an adapter or names what it needs', () => {
    expect(Object.keys(BUNDLE_ADAPTERS).sort()).toEqual(Object.keys(BOARD_COMPUTERS).sort());
  });

  it('reads many computers off one board, each fact naming its computer', () => {
    const facts = readEveryComputer(bundle);
    expect(facts.length).toBeGreaterThan(2);
    const known = new Set(Object.keys(COMPUTER_CATALOG));
    for (const f of facts) expect(known.has(f.computer), f.computer).toBe(true);
  });

  it('a move-family computer is read when the bundle carries the move and the lines before it', () => {
    const board = new Chess(FEN);
    board.move('Kb8');
    const withMove: BoardBundle = {
      ...bundle,
      fen: board.fen(),
      lines: [{ moves: ['f3h4'], cp: 120, mate: null }],
      priorMove: { fenBefore: FEN, san: 'Kb8' },
      priorMoveSeat: 'b',
      priorLines: [{ moves: ['c8b8'], cp: 120, mate: null }],
    };
    const adapter = BUNDLE_ADAPTERS.notYetPlayed;
    expect(typeof adapter).toBe('function');
    const ctx = (adapter as (b: BoardBundle) => unknown)(withMove) as { bestSan: string; cpLoss: number };
    expect(ctx.bestSan).toBe('Kb8');
    expect(ctx.cpLoss).toBe(0);
  });
});
