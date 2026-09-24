// THE COMPUTED ORDER (David 2026-09-23: "Decision computer should compute
// that!!"). Every fact is ordered by what it is worth on the board — the
// material at stake, discounted by how soon it lands — plus the student's own
// hole on it. These pin the stakes computer and the door that reads it.
//
// Negative control (run and reverted): make the door ignore `stakes` and the
// queen-skewer and the fundamental tests fail — the tie table alone cannot see
// that a queen outweighs a knight, or that a bigger cost should lead. The
// pawn-pin and no-stakes tests still pass then: the unified tie order already
// puts a hanging piece over a coming pin (the old live table did not).
import { ALL_GREY } from './teachingLayers';
import { describe, it, expect } from 'vitest';
import {
  exchangeStakes, forkPoints, lineTacticPoints, costStakes, stakeValue,
  STAKED_FLOOR, MATE_POINTS, type FactStakes,
} from './factStakes';
import { decide } from './coachDecider';
import { NO_BOOST } from './studentMomentBoost';
import type { ImportanceSignals } from './narrationImportance';

describe('factStakes — what a fact is worth, from the board', () => {
  it('a knight the opponent can take for free is worth 3, one ply away when they are on move', () => {
    // A White knight on e5 attacked by the d6 pawn and defended by nothing, Black to move.
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3';
    expect(exchangeStakes(fen, ['e5'])).toEqual({ points: 3, plies: 1 });
    // …and two plies away when White (its owner) is on move instead.
    const whiteToMove = fen.replace(' b ', ' w ');
    expect(exchangeStakes(whiteToMove, ['e5'])).toEqual({ points: 3, plies: 2 });
  });

  it('a defended piece that loses nothing by exchange carries no stakes', () => {
    expect(exchangeStakes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e2', 'g1'])).toBeNull();
  });

  it('a fork wins the smaller target; a royal fork wins the other piece', () => {
    expect(forkPoints(['q', 'r'])).toBe(5);
    expect(forkPoints(['k', 'q'])).toBe(9);
    expect(forkPoints(['n'])).toBe(0);
  });

  it('a pin costs the front piece, a skewer the piece behind', () => {
    expect(lineTacticPoints('n', 'q')).toBe(3);   // knight pinned to the queen
    expect(lineTacticPoints('n', 'k')).toBe(3);   // knight pinned to the king
    expect(lineTacticPoints('k', 'q')).toBe(9);   // king skewered, queen falls
    expect(lineTacticPoints('q', 'r')).toBe(5);   // queen skewered, rook falls
  });

  it('distance discounts: the queen three plies away outweighs the knight one ply away', () => {
    const knightNow = stakeValue({ points: 3, plies: 1 })!;
    const queenLater = stakeValue({ points: 9, plies: 3 })!;
    const pawnLater = stakeValue({ points: 1, plies: 3 })!;
    expect(queenLater).toBeGreaterThan(knightNow);
    expect(knightNow).toBeGreaterThan(pawnLater);
    expect(stakeValue({ points: MATE_POINTS, plies: 4 })!).toBeGreaterThan(stakeValue({ points: 9, plies: 0 })!);
    // Any staked fact outranks the whole tie table (0–100).
    expect(pawnLater).toBeGreaterThan(STAKED_FLOOR);
  });

  it('a cost already paid lands now; no cost, no stakes', () => {
    expect(costStakes(150)).toEqual({ points: 1.5, plies: 0 });
    expect(costStakes(0)).toBeNull();
    expect(costStakes(null)).toBeNull();
  });
});

describe('the door orders every surface by computed value', () => {
  const student = { rating: 1500, weaknesses: [], need: null, moveAdvice: null, momentBoost: NO_BOOST, layers: ALL_GREY };
  const blunder: ImportanceSignals = { decision: null, cpLossCp: 300, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
  const run = (facts: Array<[string, string, FactStakes | null]>) => decide(blunder, student, {
    facts: facts.map(([t]) => t),
    squares: new Map(),
    family: new Map(facts.map(([t, k]) => [t, k] as const)),
    stakes: new Map(facts.flatMap(([t, , st]) => (st ? [[t, st] as const] : []))),
  }, 'interrupt');

  const HANG = 'They are threatening to win the knight on f3.';
  const QUEEN_SKEWER = 'A bishop on b5 would skewer your queen to your rook.';
  const PAWN_PIN = 'A bishop on g4 would pin your pawn.';
  const PLAN = 'The plan is to push the queenside pawns.';

  it('a queen skewer three plies away leads a knight hanging next move', () => {
    const d = run([[HANG, 'must-defend', { points: 3, plies: 1 }], [QUEEN_SKEWER, 'latent-danger', { points: 9, plies: 3 }]]);
    expect(d.spoken).toEqual([QUEEN_SKEWER, HANG]);
  });

  it('a knight hanging next move leads a pawn pin three plies away — the order the hand table had backwards', () => {
    const d = run([[PAWN_PIN, 'latent-danger', { points: 1, plies: 3 }], [HANG, 'must-defend', { points: 3, plies: 1 }]]);
    expect(d.spoken).toEqual([HANG, PAWN_PIN]);
  });

  it('review: the broken fundamental leads when its cost is the biggest thing on the ply, not otherwise', () => {
    const PRINCIPLE = '[principle] You left the knight without a defender.';
    const LOOSE = '[loose] Newly undefended: your bishop on c4.';
    const big = run([[LOOSE, 'loose', { points: 3, plies: 1 }], [PRINCIPLE, 'principle', { points: 3.2, plies: 0 }]]);
    expect(big.spoken[0]).toBe(PRINCIPLE);
    const small = run([[LOOSE, 'loose', { points: 3, plies: 1 }], [PRINCIPLE, 'principle', { points: 0.6, plies: 0 }]]);
    expect(small.spoken[0]).toBe(LOOSE);
  });

  it('a fact with no stakes follows every fact that has them', () => {
    const d = run([[PLAN, 'structure-plan', null], [PAWN_PIN, 'latent-danger', { points: 1, plies: 3 }]]);
    expect(d.spoken).toEqual([PAWN_PIN, PLAN]);
  });
});
