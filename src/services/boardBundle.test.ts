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

/** The computers the bundle reaches today; only rises. */
const ADAPTER_FLOOR = 259;

/** Real boards with their engine lines (audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl). */
const BENCH: Array<{ id: string; fen: string; lines: Array<{ moves: string[]; cp: number | null; mate: number | null }> }> = [
  { id: 'a-guide-to-underpromotion#0', fen: '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1', lines: [{ moves: ['c6c7', 'a1b2', 'c7c8q', 'd5d3', 'c8f5', 'b2c3', 'f5f2', 'd3d2', 'f2f6', 'c3d3'], cp: 271, mate: null }, { moves: ['b6c7', 'd5d3', 'c7b7', 'd3d2', 'b7a6', 'd2c2', 'a6b5', 'c2c3', 'b5b6', 'c3c2'], cp: 0, mate: null }, { moves: ['b6a6', 'd5c5', 'a6b6', 'c5c2', 'b6c7', 'c2d2', 'c7c8', 'd2c2', 'c8d7', 'c2c3'], cp: 0, mate: null }] },
  { id: 'a-guide-to-underpromotion#3', fen: '8/1pRP4/p7/1kP2p2/1p6/4K2r/P7/8 w - - 0 67', lines: [{ moves: ['e3d4', 'b7b6', 'd7d8q', 'h3h2', 'd8d6', 'h2d2', 'd4e5', 'd2e2', 'e5f6', 'e2a2'], cp: 457, mate: null }, { moves: ['e3d2', 'h3h2', 'd2e3', 'f5f4', 'e3d3', 'h2h1', 'c7b7', 'b5c6', 'd7d8n', 'c6c5'], cp: 37, mate: null }, { moves: ['e3e2', 'h3h2', 'e2e3', 'f5f4', 'e3d3', 'h2h1', 'c7b7', 'b5c6', 'd7d8n', 'c6c5'], cp: 37, mate: null }] },
  { id: 'alekhines-gun2#1', fen: '3r2k1/pp2bpp1/1qr1b2p/3p4/8/P1B1PB2/1P2QPPP/3R1RK1 w - - 0 22', lines: [{ moves: ['d1d3', 'b6c7', 'g2g3', 'e7a3', 'c3g7', 'g8g7', 'b2a3', 'c7e5', 'f1d1', 'c6c4'], cp: 74, mate: null }, { moves: ['h2h3', 'e7a3', 'c3g7', 'g8g7', 'b2a3', 'b6b3', 'd1d4', 'c6c4', 'd4d3', 'b3c2'], cp: 57, mate: null }, { moves: ['e2d3', 'b6c7', 'h2h3', 'c6c4', 'd1a1', 'e7d6', 'a1c1', 'c7e7', 'f1d1'], cp: 44, mate: null }] },
  { id: 'beginner-chess-strategy#4', fen: '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17', lines: [] },
];

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

  it('the computers the bundle reaches only rise (a converted adapter never goes back to needs)', () => {
    const reached = Object.values(BUNDLE_ADAPTERS).filter((a) => typeof a === 'function').length;
    expect(reached).toBeGreaterThanOrEqual(ADAPTER_FLOOR);
    // Every computer left out says why, in words.
    for (const [id, a] of Object.entries(BUNDLE_ADAPTERS)) {
      if (typeof a !== 'function') expect(a.needs.join(' ').length, id).toBeGreaterThan(10);
    }
  });

  it('the newly reached computers speak on real boards (Danya bench boards, a move off each, a real game)', () => {
    const said = new Set<string>();
    const read = (b: BoardBundle): void => { for (const f of readEveryComputer(b)) said.add(f.computer); };
    for (const r of BENCH) {
      const student = r.fen.split(' ')[1] === 'b' ? 'b' : 'w';
      read({ fen: r.fen, student, lines: r.lines, rating: 1500, history: [], priorMove: null, priorMoveSeat: null, priorLines: null });
      const u = r.lines[0]?.moves[0];
      if (!u) continue;
      const c = new Chess(r.fen);
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      read({ fen: c.fen(), student, lines: [{ ...r.lines[0], moves: r.lines[0].moves.slice(1) }], rating: 1500, history: [], priorMove: { fenBefore: r.fen, san: m.san }, priorMoveSeat: student, priorLines: r.lines });
    }
    // A game from the start, the student's slip at the end: the game-family reads.
    const game = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2'];
    const g = new Chess();
    for (const s of game.slice(0, -1)) g.move(s);
    const before = g.fen();
    g.move('Be2');
    read({ fen: g.fen(), student: 'w', lines: [{ moves: ['d4f3'], cp: null, mate: -1 }], rating: 1500, history: game, priorMove: { fenBefore: before, san: 'Be2' }, priorMoveSeat: 'w', priorLines: [{ moves: ['f1e1'], cp: -300, mate: null }] });
    // Read off each kind of field the bundle now fills: engine lines, the
    // move and its cost, words, the game's moves.
    for (const id of ['structurePlan', 'planOfTheBoard', 'criticalMoment', 'structureNaming', 'boardTactics', 'principle', 'takeStock', 'structureMove', 'onlyMoveRead', 'standingRead', 'moveFundamentals', 'boardTeacherOwn', 'causalChain', 'blunderCheck', 'moveAllows']) {
      const computer = (BOARD_COMPUTERS as Record<string, { computer: string }>)[id].computer;
      expect(said.has(computer), id).toBe(true);
    }
  }, 120_000);

  it('a game-family computer is not read when the history does not reach the board', () => {
    const ctx = (BUNDLE_ADAPTERS.causalChain as (b: BoardBundle) => unknown)({ ...bundle, history: ['e4', 'e5'] });
    expect(ctx).toBeNull();
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
