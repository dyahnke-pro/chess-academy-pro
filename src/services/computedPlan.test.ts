import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computedPlanAt, isPawnBreak } from './computedPlan';
import type { LichessExplorerResult } from '../types';

// A tiny master tree keyed by the move list from the start. The tabia is
// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3; White's two orders (Nbd2 then
// Nf1, or O-O first) meet on the same board, and d4 is the break.
const TABIA = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'];
const row = (san: string, n: number): LichessExplorerResult['moves'][number] =>
  ({ san, uci: '', white: n, draws: 0, black: 0, averageRating: 2500 }) as LichessExplorerResult['moves'][number];
const node = (n: number, moves: Array<[string, number]>): LichessExplorerResult =>
  ({ white: n, draws: 0, black: 0, moves: moves.map(([s, g]) => row(s, g)), topGames: [], opening: null }) as unknown as LichessExplorerResult;

const T = (...m: string[]): string => [...TABIA, ...m].join(' ');
const TREE: Record<string, LichessExplorerResult> = {
  [TABIA.join(' ')]: node(100, [['d6', 100]]),
  [T('d6')]: node(100, [['Nbd2', 60], ['O-O', 40]]),
  [T('d6', 'Nbd2')]: node(60, [['O-O', 60]]),
  [T('d6', 'O-O')]: node(40, [['O-O', 40]]),
  // Two orders meet on the board after both sides castle. The tree counts a
  // board's games from every order — 500 here, most from lines outside this
  // walk — so the plan may credit only the share that came down from the tabia.
  [T('d6', 'Nbd2', 'O-O')]: node(500, [['O-O', 500]]),
  [T('d6', 'O-O', 'O-O')]: node(40, [['Nbd2', 40]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O')]: node(500, [['a6', 500]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6')]: node(500, [['Re1', 300], ['d4', 200]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1')]: node(300, [['h6', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6')]: node(300, [['Nf1', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6', 'Nf1')]: node(300, [['Be6', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6', 'Nf1', 'Be6')]: node(300, [['Ng3', 300]]),
};
const lookup = (sans: readonly string[]): Promise<LichessExplorerResult | null> => Promise.resolve(TREE[sans.join(' ')] ?? null);

describe('computedPlanAt', () => {
  it('counts what masters played from the tabia as shares that never pass 100%, one board once', async () => {
    const plan = await computedPlanAt(TABIA, 'white', 'italian', 'computed-italian--1', { lookup, floorPly: 0 });
    expect(plan).not.toBeNull();
    const tabia = new Chess();
    for (const m of TABIA) tabia.move(m);
    expect(plan!.criticalPositionFen).toBe(tabia.fen());
    expect(plan!.lineMoves).toEqual(TABIA);
    expect(plan!.pawnBreaks.map((b) => b.move)).toEqual(['d4']);
    // Every order reaches the board before d4 (share 1); d4 is 200 of its 500.
    expect(plan!.pawnBreaks[0].explanation).toMatch(/^40%/);
    // Nb1–d2–f1–g3: the longer route speaks, never the shorter start of it.
    expect(plan!.pieceManeuvers.map((m) => m.route)).toEqual(['b1–d2–f1–g3']);
    expect(plan!.pieceManeuvers[0].explanation).toMatch(/^60%/);
    expect(plan!.overview).toMatch(/^In the 100 master games that reached this position/);
    for (const m of plan!.overview.match(/\d+%/g) ?? []) expect(Number(m.replace('%', ''))).toBeLessThanOrEqual(100);
    const line = plan!.playableLines![0];
    const c = new Chess(line.fen);
    for (const s of line.moves) expect(() => c.move(s)).not.toThrow();
    expect(line.moves[0]).toBe('d6');
  });

  it('has no plan where too few masters reached the board, or nothing clears the bar', async () => {
    expect(await computedPlanAt(TABIA, 'white', 'x', 'p', { lookup: () => Promise.resolve(node(5, [['d6', 5]])), floorPly: 0 })).toBeNull();
    expect(await computedPlanAt(TABIA, 'white', 'x', 'p', { lookup: () => Promise.resolve(null), floorPly: 0 })).toBeNull();
    expect(await computedPlanAt(['e4', 'e9'], 'white', 'x', 'p', { lookup, floorPly: 0 })).toBeNull();
  });
  // A page's line runs on past the masters into strong online games (O7), so
  // its last boards are ones the master tree does not hold. The plan is read
  // from the deepest board the masters reached in numbers.
  it('reads the plan from the deepest board on the line the masters reached, a few plies back at most', async () => {
    const tabia = new Chess();
    for (const m of TABIA) tabia.move(m);
    const past = [...TABIA, 'h6', 'h3'];
    const plan = await computedPlanAt(past, 'white', 'x', 'p', { lookup, floorPly: 0 });
    expect(plan).not.toBeNull();
    expect(plan!.criticalPositionFen).toBe(tabia.fen());
    expect(plan!.lineMoves).toEqual(TABIA);
    expect(plan!.pawnBreaks.map((b) => b.move)).toEqual(['d4']);
    // Six plies past the masters still picks up near the line's end; seven is
    // too far back to be the line's plan.
    const six = [...TABIA, 'h6', 'h3', 'a6', 'a3', 'Kf8', 'Kf1'];
    expect(await computedPlanAt(six, 'white', 'x', 'p', { lookup, floorPly: 0 })).not.toBeNull();
    expect(await computedPlanAt([...six, 'Ke8'], 'white', 'x', 'p', { lookup, floorPly: 0 })).toBeNull();
  });

  it('leaves out of the plan what the line itself plays past the tabia', async () => {
    // The line pushes d4 itself on a board the masters barely reached: the
    // plan is read from the board before (…a6), and d4 is the line, not the plan.
    const line = [...TABIA, 'd6', 'Nbd2', 'O-O', 'O-O', 'a6', 'd4'];
    const plan = await computedPlanAt(line, 'white', 'x', 'p', { lookup, floorPly: 0 });
    expect(plan).not.toBeNull();
    expect(plan!.lineMoves).toEqual(line.slice(0, -1));
    expect(plan!.pawnBreaks.map((b) => b.move)).not.toContain('d4');
    expect(plan!.pieceManeuvers.map((m) => m.route)).toEqual(['d2–f1–g3']);
  });

  it('never steps back past a tab\'s own first move onto its trunk', async () => {
    const past = [...TABIA, 'h6', 'h3'];
    expect(await computedPlanAt(past, 'white', 'x', 'p', { lookup, floorPly: TABIA.length + 1 })).toBeNull();
  });
});

describe('isPawnBreak', () => {
  const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
  it('a pawn move that meets an enemy pawn is a break; a quiet push is not', () => {
    expect(isPawnBreak(after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6']), 'd4')).toBe(true);
    expect(isPawnBreak(after(['e4', 'd5']), 'exd5')).toBe(true);
    expect(isPawnBreak(after(['e4', 'e5']), 'h3')).toBe(false);
    expect(isPawnBreak(after(['e4', 'e5']), 'Nf3')).toBe(false);
  });
});
