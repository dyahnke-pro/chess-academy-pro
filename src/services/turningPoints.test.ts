import { describe, expect, it } from 'vitest';
import { causeLine, selectTurningPoints, turningReveal, winChance, type TurningSegmentLike, type TurningTrace } from './turningPoints';

// KID game (walkGames fixture, 2026-09-25), move 15: Black played Qh4 when Nxf1
// took a loose rook. Evals white-POV.
const FEN = 'r1b2rk1/pp1n1pbp/2pp1np1/q3p3/2PPP3/2N1BN1P/PPQ1BPP1/R4RK1 b - - 0 15';

function seg(over: Partial<TurningSegmentLike>): TurningSegmentLike {
  return { ply: 30, san: 'Qh4', fenBefore: FEN, classification: 'mistake', evalBefore: -217, evalAfter: -7, bestMoveUci: null, bestMoveSan: null, playerColor: 'black', ...over };
}

describe('turningPoints — the biggest few, the cause counted across the game', () => {
  it('ranks by winning chance and drops a swing inside a decided game', () => {
    const segs: TurningSegmentLike[] = [
      { ply: 10, san: 'a6', fenBefore: FEN, classification: 'mistake', evalBefore: 0, evalAfter: 150, bestMoveUci: 'e7e5', bestMoveSan: 'e5', playerColor: 'black' },
      // still clearly winning after it (+7 → +4 for black): not a turning point
      { ply: 12, san: 'h6', fenBefore: FEN, classification: 'mistake', evalBefore: -730, evalAfter: -412, bestMoveUci: 'e7e5', bestMoveSan: 'e5', playerColor: 'black' },
      { ply: 14, san: 'g5', fenBefore: FEN, classification: 'blunder', evalBefore: -100, evalAfter: 400, bestMoveUci: 'e7e5', bestMoveSan: 'e5', playerColor: 'black' },
    ];
    const tps = selectTurningPoints(segs, 'black');
    expect([...tps.keys()].sort()).toEqual([10, 14]);
    expect(winChance(0)).toBeCloseTo(50, 5);
  });

  it('asks a classified mistake even when the swing is small, ranks by swing, and records why it skipped the rest', () => {
    // Prod KID review 2026-10-06 at depth 12: Qh4 over Nxf1, -199 → -90 (58 → 67 for black).
    const kid = seg({ evalBefore: -199, evalAfter: -90, bestMoveUci: 'g3f1', bestMoveSan: 'Nxf1' });
    const sameSwingInaccuracy = { ...kid, ply: 40, classification: 'inaccuracy' as const };
    const trace: TurningTrace[] = [];
    const tps = selectTurningPoints([kid, sameSwingInaccuracy], 'black', 3, trace);
    expect([...tps.keys()]).toEqual([30]);
    expect(trace.map((t) => [t.ply, t.skip])).toEqual([[30, null], [40, 'small-swing']]);
  });

  it('says the cause again in plain words, counted, with the drill where one exists', () => {
    const fork = { id: 'missed:fork:n', kind: 'missed' as const, tactic: 'fork', piece: 'n' as const };
    expect(causeLine(fork, 1)).toBe('You missed a knight fork.');
    expect(causeLine(fork, 2)).toBe("Again you missed a knight fork — that's two this game. Drill forks in Tactics.");
    const into = { id: 'into:fork:n', kind: 'walked-into' as const, tactic: 'fork', piece: 'n' as const };
    expect(causeLine(into, 2)).toMatch(/^Again you walked into a knight fork — that's two this game\. Before every move, check what their knight can reach\.$/);
  });

  it('one try: right gets the why in the present, wrong gets the move, the why and what it allowed', () => {
    const tp = { ply: 30, fenBefore: FEN, playedSan: 'Qd8', bestSan: 'Rab8', bestUci: 'a8b8', swing: 20, question: 'q', why: 'it would protect the pawn on b7', allowed: 'win a pawn', cause: null, causeCount: 0 };
    expect(turningReveal(tp, true)).toBe("That's it: Rab8 — it protects the pawn on b7.");
    expect(turningReveal(tp, false)).toBe('The move was Rab8 — it would protect the pawn on b7. Your Qd8 let them win a pawn.');
  });

  it('never asks without a best move, and never on the opponent\'s move', () => {
    const tps = selectTurningPoints([seg({ bestMoveSan: null }), seg({ ply: 31, playerColor: 'white', isCoachMove: true, bestMoveSan: 'Nxf1', bestMoveUci: 'g4f1' })], 'black');
    expect(tps.size).toBe(0);
  });
});

describe('one reason per move (unity U3, 52-error walk #20: the reveal and the verdict gave Bf5 two different reasons a line apart)', () => {
  it('the reveal says the reason the ply\'s own verdict already computed, never a second one', () => {
    const verdictReason = 'it would take your loose rook on f1';
    const tp = selectTurningPoints([seg({ bestMoveSan: 'Nxf1', bestMoveUci: 'd7f1', verdictReason })], 'black').get(30);
    expect(tp?.why).toBe(verdictReason);
    expect(turningReveal(tp!, false)).toContain(`The move was Nxf1 — ${verdictReason}.`);
  });
});
