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

// the-positional-queen-sacrifice #1: after Nxb5, …Bd4+ Kg3 Bf2# — the reply
// board of a future read for the side that played Nxb5.
describe('a seatless computer reads only the student\'s move', () => {
  const BEFORE = 'r4rk1/4n1pp/4bb2/1N1p4/1P2p3/P7/5KPP/1NBQRB2 b - - 0 24';
  const AFTER = (() => { const c = new Chess(BEFORE); c.move('Bd4+'); return c.fen(); })();
  const at = (student: 'w' | 'b'): BoardBundle => ({
    fen: AFTER,
    student,
    lines: [{ moves: ['f2g3', 'd4f2'], cp: null, mate: -2 }],
    rating: 1800,
    history: [],
    priorMove: { fenBefore: BEFORE, san: 'Bd4+' },
    priorMoveSeat: 'b',
    priorLines: [{ moves: ['f6d4', 'f2g3', 'd4f2'], cp: null, mate: -2 }],
  });
  it('their move is never "you play": mateLine is silent for White', () => {
    expect(readEveryComputer(at('w')).some((f) => f.computer === 'mateLine')).toBe(false);
  });
  it('the same move, the student\'s: it is read', () => {
    expect(readEveryComputer(at('b')).find((f) => f.computer === 'mateLine')?.text).toBe('It is a forced mate: you play Bd4+, they answer Kg3 and you play Bf2#.');
  });
});

// Puzzle 05jP1 (fortress.test.ts): Bxg6 leaves the light bishop against a pawn
// on h6, and the engine reads a draw from the board after it.
describe('the fortress reads off the bundle (WO-PICTURE-01 futures)', () => {
  const BEFORE = '7k/8/3K2pp/7P/4B3/8/8/8 w - - 0 71';
  const AFTER = (() => { const c = new Chess(BEFORE); c.move('Bxg6'); return c.fen(); })();
  const at: BoardBundle = {
    fen: AFTER,
    student: 'w',
    lines: [{ cp: 6, mate: null, moves: ['h8g8', 'd6e6', 'g8g7', 'g6b1', 'g7g8', 'e6f6'] }],
    rating: 1800,
    history: [],
    priorMove: { fenBefore: BEFORE, san: 'Bxg6' },
    priorMoveSeat: 'w',
    priorLines: null,
  };
  it('the replies are the bundle\'s lines: the fortress is said', () => {
    const f = readEveryComputer(at).find((x) => x.computer === 'fortress');
    expect(f?.claims).toContain('fortress:bishop-colour:b');
    expect(f?.squares).toEqual(['h6']);
  });
  it('no lines, no claim', () => {
    expect(readEveryComputer({ ...at, lines: [] }).some((x) => x.computer === 'fortress')).toBe(false);
  });
});
