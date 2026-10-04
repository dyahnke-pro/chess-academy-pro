import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { attributeLiveFundamental } from './liveFundamental';

// Clean-pass walk, game SI5q0VJz ply 77: 39.Qb8 (mate in 6, the engine's own
// top move at depth 14) was told "Always run the forcing moves first: Qb4+ won
// material by force, and this doesn't force anything." The two time-boxed reads
// differed by under a pawn inside a +8 position — noise, not a cost. Review
// grades that in expected points and calls it good; Learn used a raw 60cp floor.
const FEN = '3n1k1r/3R2pp/5q2/1Q1B4/8/P4N1P/5PP1/6K1 w - - 3 39';
// The real game to 39.Qb8 — the attributor replays the history, never the FEN.
const game = new Chess();
game.loadPgn(readFileSync(join(__dirname, '__fixtures__/SI5q0VJz.pgn'), 'utf8'));
const HISTORY = game.history().slice(0, 77);
const c = new Chess(FEN);
const base = {
  fenBefore: FEN,
  historySans: HISTORY,
  playedSan: 'Qb8',
  bestSan: 'Qb4+',
  studentColor: 'white' as const,
  // The time-boxed best line, cut where the knight takes the queen on f6.
  bestPvUci: ['b5b4', 'f8e8', 'd7c7', 'g7g6', 'b4e4', 'e8f8', 'f3e5', 'd8f7', 'e5d7', 'f8g7', 'd7f6'],
  playedPvUci: ['f8e8', 'd7d6', 'h8g8', 'd5c6', 'e8f7', 'b8c7', 'f7g6', 'c6e4', 'g6h6', 'c7c1', 'g7g5', 'd6f6'],
  replySan: 'Ke8',
};

describe('Learn flags a move with the ONE grader Review uses', () => {
  it('a sub-pawn wobble inside a crushing position is not a flagged move', () => {
    expect(c.fen()).toBe(FEN);
    expect(HISTORY[76]).toBe('Qb8');
    expect(attributeLiveFundamental({ ...base, costCp: 90, evalBeforeWhiteCp: 860, evalAfterWhiteCp: 770 })).toEqual([]);
  });

  it('the same 90cp at a level position still flags', () => {
    const out = attributeLiveFundamental({ ...base, costCp: 90, evalBeforeWhiteCp: 30, evalAfterWhiteCp: -60 });
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('the backward look names a drawback only on a graded fault', () => {
  it('39.Qb8 at +8.6 → +7.7 carries no "drawback" sentence', async () => {
    const { backwardLook } = await import('./backwardLook');
    const after = new Chess(FEN); after.move('Qb8');
    const look = backwardLook({
      fenBefore: FEN, fenAfter: after.fen(), playedSan: 'Qb8', priorMove: null,
      bestSan: 'Qb4+', bestPvUci: base.bestPvUci, replyPvUci: base.playedPvUci, replySan: 'Ke8',
      cpLoss: 90, studentColor: 'white', moverEvalAfterCp: 770,
    });
    expect(look?.kind).not.toBe('drawback');
    expect(look?.line ?? '').not.toMatch(/long way from your king/);
  });
});

describe('what a move allowed is said only of a graded fault', () => {
  it('26.Rac1 at +8.0 → +6.7 is not "that let them win a piece"', async () => {
    const { backwardLook } = await import('./backwardLook');
    const before = 'Q2n1k1r/2R3pp/4pq2/3p1b2/8/P4N2/B4PPP/R5K1 w - - 1 26';
    const after = new Chess(before); after.move('Rac1');
    const look = backwardLook({
      fenBefore: before, fenAfter: after.fen(), playedSan: 'Rac1', priorMove: null,
      bestSan: 'Re1', bestPvUci: ['a1e1', 'h7h5', 'c7c8', 'f8f7', 'f3e5', 'f7g8', 'c8d8', 'f6d8', 'a8d8', 'g8h7', 'd8c7', 'h8f8'],
      replyPvUci: ['h7h6', 'c7d7', 'f8e8', 'f3e5', 'h8f8', 'd7c7', 'f6e5', 'a8a4', 'd8c6', 'a4c6', 'e8d8'],
      replySan: 'e5', cpLoss: 120, studentColor: 'white', moverEvalAfterCp: 670,
    });
    expect(look?.line ?? '').not.toMatch(/let them win/);
  });
});

describe('the habit lanes speak only of a graded fault', () => {
  it('a two-pawn wobble at +13 → +11 gets no "Blunder check" — the grade decides, not the raw drop', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const before = 'Q2n1k1r/2R3pp/5q2/3ppb2/8/P4N2/B4PPP/2R3K1 w - - 0 27';
    const hist = game.history().slice(0, 53);
    expect(hist[52]).toBe('Rc8');
    const hints = studentMoveTeaching({
      fenBefore: before, san: 'Rc8', history: hist, cpLoss: 200, bothCp: true,
      bestSan: 'Qxd5', bestLine: undefined, reply: 'Bxc8', cpAfter: 1100,
    });
    expect(hints.map((h) => h.lane)).not.toContain('blunderCheck');
  });

  it('the same board at a real cost (+12 → +6.9, about 6% expected points) still names it', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const hints = studentMoveTeaching({
      fenBefore: 'Q2n1k1r/2R3pp/5q2/3ppb2/8/P4N2/B4PPP/2R3K1 w - - 0 27', san: 'Rc8', history: game.history().slice(0, 53),
      cpLoss: 520, bothCp: true, bestSan: 'Qxd5', bestLine: undefined, reply: 'Bxc8', cpAfter: 690,
    });
    expect(hints.map((h) => h.lane)).toContain('blunderCheck');
  });
});
