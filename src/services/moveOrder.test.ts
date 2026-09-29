// Move order on his own games (census #1). Engine lines are stored with each
// position (depth 14), so no engine runs here.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveOrder, followUpOf } from './moveOrder';
import type { AnalysisLine } from '../types';
import fixture from './__fixtures__/moveOrder-his.json';

interface Raw { cp: number; pv: string[] }
interface Point { game: string; ply: number; fenBefore: string; x: string; y: string; xLine: Raw; yFirst: Raw; his: string | null }
const points = fixture as Point[];
const line = (r: Raw): AnalysisLine => ({ rank: 1, evaluation: r.cp, moves: r.pv, mate: null });
const uciOf = (fen: string, san: string): string => {
  const m = new Chess(fen).move(san);
  return `${m.from}${m.to}${m.promotion ?? ''}`;
};
const at = (game: string, ply: number): Point => {
  const p = points.find((q) => q.game === game && q.ply === ply);
  if (!p) throw new Error(`no fixture ${game}:${ply}`);
  return p;
};
const run = (p: Point, seat: 'student' | 'opponent' = 'student') =>
  moveOrder(p.fenBefore, p.x, uciOf(p.fenBefore, p.y), line(p.xLine), line(p.yFirst), seat);

describe('moveOrder — his "this first, because…"', () => {
  it('cxd4 first: his own "the key move order — you take on d4 first"', () => {
    const out = run(at('cdEASsRLWcg', 14));
    expect(out).not.toBeNull();
    expect(out?.text).toMatch(/cxd4/);
    expect(out?.text).toMatch(/Nc6/);
    expect(out?.text).toMatch(/drops|costs you material/);
  });

  it('Be3 first — Nc3 right now drops the d4-pawn', () => {
    const out = run(at('1rcEbI44WqE', 13));
    expect(out?.text).toMatch(/^(Be3 first — Nc3 right now runs into …Qxd4|The order matters: Be3 before Nc3)/);
    expect(out?.squares).toContain('d4');
  });

  it('speaks for the opponent seat in their words', () => {
    expect(run(at('1rcEbI44WqE', 13), 'opponent')?.text).toMatch(/^(Their|They)/);
  });

  it('says nothing when the follow-up costs nothing', () => {
    const p = at('1rcEbI44WqE', 13);
    expect(moveOrder(p.fenBefore, p.x, uciOf(p.fenBefore, p.y), line(p.xLine), line(p.xLine), 'student')).toBeNull();
  });

  it('says nothing when the follow-up simply hangs the piece it moves', () => {
    // 1.e4 e5: "Qh5 first"? Play the follow-up Qg4 first and …d5?? is not it —
    // use a board where Y lands en prise: after 1.e4 e5 2.Nf3, Y = Bc4? no — a
    // bare constructed case: Y = Qh5 answered by …Nf6xh5 taking the queen.
    const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const out = moveOrder(fen, 'Nc3', 'd1h5', { rank: 1, evaluation: 30, moves: [], mate: null },
      { rank: 1, evaluation: -900, moves: ['f6h5'], mate: null }, 'student');
    expect(out).toBeNull();
  });

  it('followUpOf reads the second move of the engine line', () => {
    expect(followUpOf([{ rank: 1, evaluation: 0, moves: ['e7e5', 'g1f3'], mate: null }])).toBe('g1f3');
    expect(followUpOf([])).toBeNull();
  });
});
