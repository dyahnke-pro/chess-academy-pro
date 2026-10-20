// A PRICE NEAR A BAND EDGE IS NOT SETTLED (Smith-Morra replay 2026-10-20,
// 10.Bf4). The live engine priced Bf4 at 59cp from its depth-14 fan and the
// door affirmed it; one step deeper the same search says ~150 — a mistake. The
// one price now deepens an unsettled read before anything grades on it, and
// the fan's best move never pays for the deeper search.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { scoreMoves } = vi.hoisted(() => ({ scoreMoves: vi.fn() }));
vi.mock('./refutedAlternative', async (importOriginal) => {
  const real = await importOriginal<typeof import('./refutedAlternative')>();
  return { ...real, SINGLETON_SCORER: { ...real.SINGLETON_SCORER, scoreMoves } };
});

import { gradePlayedMove, liveMovePrice, priceLabel, priceSettled, clearMovePriceMemo } from './playedMoveGrade';
import { decideTurn, type LaneFact } from './learnTurnDoor';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { COACH_TURN_DEPTH } from './engineConstants';

// Before 10.Bf4 (White to move): Qb3 is best.
const BF4 = 'r1bqk1nr/pp2p1bp/2np2p1/6N1/4P3/2N5/PP3PPP/R1BQ1RK1 w - - 2 10';
const BF4_AFTER = 'r1bqk1nr/pp2p1bp/2np2p1/6N1/4PB2/2N5/PP3PPP/R2Q1RK1 b - - 3 10';
const line = (rank: number, evaluation: number, uci: string): { rank: number; evaluation: number; mate: null; moves: string[] } => ({ rank, evaluation, mate: null, moves: [uci] });
/** The live depth-14 fan: Qb3 −194, Bf4 −253 — 59cp. */
const FAN_D14 = { bestMove: 'd1b3', depth: 14, isMate: false, topLines: [line(1, -194, 'd1b3'), line(2, -253, 'c1f4')] };
/** The same two moves scored one step deeper: Bf4 −343, ~149. */
const DEEPER = [{ evaluation: -194, mate: null, moves: ['d1b3'] }, { evaluation: -343, mate: null, moves: ['c1f4'] }];

beforeEach(() => {
  clearMovePriceMemo();
  scoreMoves.mockReset();
  scoreMoves.mockResolvedValue(DEEPER);
});

describe('10.Bf4 — the price deepens before it grades', () => {
  it('the depth-14 59cp straddles a band within the noise', () => {
    expect(priceSettled({ costCp: 59, scores: { bestWhiteCp: -194, playedWhiteCp: -253 } }, 'w')).toBe(false);
  });
  it('the one price is the deeper search: ~149, a mistake, settled once two depths agree', async () => {
    const p = await liveMovePrice(BF4, 'c1f4', FAN_D14, COACH_TURN_DEPTH);
    expect(p?.costCp).toBe(149);
    expect(p?.settled).toBe(true);
    expect(priceLabel(p, 'w')).toBe('mistake');
    // depth 16 moved the band (inaccuracy → mistake); depth 18 held it.
    expect(scoreMoves.mock.calls.map((c) => c[2])).toEqual([COACH_TURN_DEPTH + 2, COACH_TURN_DEPTH + 4]);
  });
  it('the cheap fan grade does not grade an unsettled 59 (it was the affirm)', () => {
    expect(gradePlayedMove({ fenBefore: BF4, playedUci: 'c1f4', fenAfter: BF4_AFTER, analysisBefore: FAN_D14, studentColor: 'w', depth: COACH_TURN_DEPTH })).toBeNull();
  });
});

describe('a clearly fine move never pays the deeper search', () => {
  it("the fan's best costs nothing and is settled", async () => {
    const p = await liveMovePrice(BF4, 'd1b3', FAN_D14, COACH_TURN_DEPTH);
    expect(p).toEqual({ costCp: 0, scores: { bestWhiteCp: -194, playedWhiteCp: -194 }, settled: true });
    expect(scoreMoves).not.toHaveBeenCalled();
  });
  it('a move a few centipawns off the best, in the fan, is settled at its own depth', async () => {
    const fan = { ...FAN_D14, topLines: [line(1, 30, 'd1b3'), line(2, 22, 'c1f4')] };
    const p = await liveMovePrice(BF4, 'c1f4', fan, COACH_TURN_DEPTH);
    expect(p?.costCp).toBe(8);
    expect(p?.settled).toBe(true);
    expect(scoreMoves).not.toHaveBeenCalled();
  });
});

describe('an affirm never speaks on an unsettled price', () => {
  const affirm = { text: 'Your bishop develops with tempo on the long diagonal.', lane: 'strongChoice' as const };
  it('held while unsettled, spoken once settled', () => {
    const fact = (t: string): LaneFact => ({ lane: affirm.lane, text: t, fen: BF4_AFTER, squares: ['f4'], role: 'teach', proof: NO_PROOF.stated, ownMoveReason: true, namesStudentMove: NAMES_NO_MOVE });
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const held = decideTurn([fact(affirm.text)], '', undefined, null, null, false, { kind: 'instant', ply: 19, moveCostCp: null, priceSettled: false, midExchange: null });
    off();
    expect(held.spoke).not.toContain(affirm.lane);
    expect(rows[0]?.heldWhy?.[affirm.lane]).toBe('price-unsettled');
    const spoke = decideTurn([fact(affirm.text)], '', undefined, null, null, false, { kind: 'instant', ply: 19, moveCostCp: 0, priceSettled: true, midExchange: null });
    expect(spoke.spoke).toContain(affirm.lane);
  });
});
