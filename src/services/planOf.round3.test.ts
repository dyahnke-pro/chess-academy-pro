// PLANS ROUND 3, on real game boards: the two weaknesses, the regroup, the
// king's own blocker (structureOf), passive defence, the race the other side
// wins, and only the best-supported plan said (planOf).
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import replay from '../test/fixtures/learn-replay-games.json';
import models from '../data/model-games.json';
import { structureOf } from './structureOf';
import { planOf } from './planOf';
import type { AnalysisLine } from '../types';

interface FixLine { uci: string; cp: number | null; mate: number | null; pv: string[] }
const replayGame = (id: string) => (replay as { games: Array<{ id: string; sans: string[]; reads: Array<{ before: FixLine[] }> }> }).games.find((g) => g.id === id)!;
const boardAt = (sans: readonly string[], ply: number): string => { const c = new Chess(); for (const s of sans.slice(0, ply)) c.move(s); return c.fen(); };
const modelSans = (id: string): string[] => (models as Array<{ id: string; pgn: string }>).find((g) => g.id === id)!.pgn.trim().split(/\s+/);
const linesOf = (ls: FixLine[]): AnalysisLine[] => ls.map((l, k) => ({ rank: k + 1, evaluation: l.cp ?? 0, mate: l.mate, moves: l.pv }));

describe('structureOf, round 3', () => {
  it('two weaknesses: Fischer–Spassky game 6, move 39 — White\'s b3 and g2, on files Black has no pawn on', () => {
    const fen = boardAt(modelSans('mg-fischer-spassky-g6'), 76);
    const s = structureOf(fen, 'b').find((x) => x.kind === 'two-weaknesses');
    expect(s?.squares).toEqual(['b3', 'g2']);
  });

  it('regroup: the Colle at move 9, Black\'s e6–d5 locked against e5–d4 with no break', () => {
    const g = replayGame('colle800');
    const s = structureOf(boardAt(g.sans, 17), 'b').find((x) => x.kind === 'regroup');
    expect(s?.squares).toEqual(['e6', 'd5']);
  });

  it('king-blocked: the Sicilian at move 7, Black\'s bishop on f8 the last piece at home', () => {
    const g = replayGame('sicilian1200');
    const s = structureOf(boardAt(g.sans, 12), 'b').find((x) => x.kind === 'king-blocked');
    expect(s?.piece).toEqual({ type: 'b', square: 'f8' });
    // Move two, with every piece at home, is no plan.
    expect(structureOf(boardAt(replayGame('colle800').sans, 3), 'w').some((x) => x.kind === 'king-blocked')).toBe(false);
  });
});

describe('planOf, round 3', () => {
  it('passive defence: the Sicilian Closed, White down four and a half pawns, nothing forcing', () => {
    const g = replayGame('sicilianClosed1000');
    const out = planOf({ fen: boardAt(g.sans, 62), lines: linesOf(g.reads[62].before), student: 'b', namesMoves: true });
    expect(out.mover.map((c) => c.claim)).toEqual(['plan:w:passive-defence']);
    expect(out.mover[0].text).toMatch(/^Their plan/);
  });

  it('a passer race they win takes the mover\'s own push off the list (Caro Tartakower ending)', () => {
    const fen = boardAt(modelSans('mg-caro-tartakower'), 98);
    const lines: AnalysisLine[] = [{ rank: 1, evaluation: -300, mate: null, moves: ['a3a4', 'h3h2', 'a4a5'] }];
    const out = planOf({ fen, lines, student: 'w', namesMoves: true });
    expect(out.mover.some((c) => c.structure?.kind === 'majority')).toBe(false);
  });

  it('only the best-supported plan is said, on every board of the replays', () => {
    for (const g of (replay as { games: Array<{ sans: string[]; reads: Array<{ before: FixLine[] }>; studentSide: string }> }).games) {
      for (let p = 0; p < g.reads.length; p += 4) {
        const out = planOf({ fen: boardAt(g.sans, p), lines: linesOf(g.reads[p].before), student: g.studentSide === 'white' ? 'w' : 'b', namesMoves: true });
        expect(out.mover.length).toBeLessThanOrEqual(1);
      }
    }
  });
});
