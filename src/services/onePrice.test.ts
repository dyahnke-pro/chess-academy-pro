// ONE PRICE FOR A MOVE (#2 root cause 4, 2026-10-20). David's Kg5 in the
// Smith-Morra replay was 63 at the door (a depth-6 spread of lines read as a
// cost), 115 in the record (a read before minus a separate read after) and
// Stockfish depth 20 says 112-142. Every reader now takes the ONE memoized
// one-search price, and the band is graded from that search's own two scores.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { scoreMoves } = vi.hoisted(() => ({ scoreMoves: vi.fn() }));
vi.mock('./refutedAlternative', async (importOriginal) => {
  const real = await importOriginal<typeof import('./refutedAlternative')>();
  return { ...real, SINGLETON_SCORER: { ...real.SINGLETON_SCORER, scoreMoves } };
});

import { gradePlayedMove, liveMovePrice, priceLabel, clearMovePriceMemo, PRICE_DEEPEN_BUDGET_MS } from './playedMoveGrade';
import { callInaccuracyDetailed } from './inaccuracyCall';
import { COACH_TURN_DEPTH } from './engineConstants';

const KG5 = '5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w - - 4 39';
const KG5_AFTER = '5k2/1p6/3p2P1/p5K1/3nP3/2N5/8/8 b - - 5 39';
const line = (rank: number, evaluation: number, uci: string): { rank: number; evaluation: number; mate: null; moves: string[] } => ({ rank, evaluation, mate: null, moves: [uci] });
/** The door's 6-line probe, cut short by its budget at depth 6 (Stockfish 16 numbers). */
const SHALLOW_FAN = {
  bestMove: 'e4e5', depth: 6,
  topLines: [line(1, -17, 'e4e5'), line(2, -25, 'f4e3'), line(3, -77, 'f4g5'), line(4, -77, 'c3d5'), line(5, -89, 'g6g7'), line(6, -109, 'c3a2')],
};
/** One search at depth 14, both moves: e5 -4, Kg5 -137. */
const ONE_SEARCH = [{ evaluation: -4, mate: null, moves: ['e4e5'] }, { evaluation: -137, mate: null, moves: ['f4g5'] }];

beforeEach(() => {
  clearMovePriceMemo();
  scoreMoves.mockReset();
  scoreMoves.mockResolvedValue(ONE_SEARCH);
});

describe('the door never reads a cut-short fan as a cost', () => {
  it('a depth-6 spread grades nothing at depth 14 (it said 60 for Kg5)', () => {
    const g = gradePlayedMove({ fenBefore: KG5, playedUci: 'f4g5', fenAfter: KG5_AFTER, analysisBefore: SHALLOW_FAN, studentColor: 'w', depth: COACH_TURN_DEPTH });
    expect(g).toBeNull();
  });
  it('a fan that reached the depth grades from its own lines — unless its 60 sits on a band edge', () => {
    // -17 vs -77 straddles a band within the search's noise (the 10.Bf4
    // shape): the one price deepens it; the cheap grade stays silent.
    const g = gradePlayedMove({ fenBefore: KG5, playedUci: 'f4g5', fenAfter: KG5_AFTER, analysisBefore: { ...SHALLOW_FAN, depth: 14 }, studentColor: 'w', depth: COACH_TURN_DEPTH });
    expect(g).toBeNull();
    // A settled gap from the same fan still grades (the knight's −109, a clear mistake).
    const far = gradePlayedMove({ fenBefore: KG5, playedUci: 'c3a2', fenAfter: KG5_AFTER, analysisBefore: { ...SHALLOW_FAN, depth: 14, topLines: [line(1, -17, 'e4e5'), line(2, -400, 'c3a2')] }, studentColor: 'w', depth: COACH_TURN_DEPTH });
    expect(far?.cpLossCp).toBe(383);
  });
});

describe('one memoized price per (fen, move)', () => {
  it('the door and the record read the same search: 133, scored once', async () => {
    const door = await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH);
    // The record arrives later with its own read — it gets the door's price.
    const record = await liveMovePrice(KG5, 'f4g5', { depth: 14, topLines: [line(1, -3, 'e4e5')] }, COACH_TURN_DEPTH);
    expect(door).toMatchObject({ costCp: 133, scores: { bestWhiteCp: -4, playedWhiteCp: -137 }, settled: true });
    expect(record).toBe(door);
    // HOW IT WAS SEARCHED rides the price (OS-11): asked at 14, deepened to 16.
    expect(door?.search).toMatchObject({ baseDepth: COACH_TURN_DEPTH, depthReached: COACH_TURN_DEPTH + 2, deepened: true });
    expect(typeof door?.search?.searchMs).toBe('number');
    // 133 sits near a band edge, so the price deepened once (two depths agree:
    // settled) — and the record reading it later searched nothing more.
    expect(scoreMoves.mock.calls.map((c) => c[2])).toEqual([COACH_TURN_DEPTH, COACH_TURN_DEPTH + 2]);
    expect(priceLabel(door, 'w')).toBe('mistake');
  });
  it('an unpriceable move is null, never free — and is not remembered', async () => {
    scoreMoves.mockRejectedValueOnce(new Error('engine down'));
    expect(await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH)).toBeNull();
    expect(await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH)).toMatchObject({ costCp: 133, scores: { bestWhiteCp: -4, playedWhiteCp: -137 }, settled: true });
  });
});

describe('the price says how it was searched (OS-11)', () => {
  it('a settled first search did not deepen: its depth is the ask', async () => {
    scoreMoves.mockResolvedValue([{ evaluation: -4, mate: null, moves: ['e4e5'] }, { evaluation: -400, mate: null, moves: ['f4g5'] }]);
    const p = await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH);
    expect(p?.search).toMatchObject({ baseDepth: COACH_TURN_DEPTH, depthReached: COACH_TURN_DEPTH, deepened: false });
  });
  it('the depth reached is the search\'s own, not the ask', async () => {
    scoreMoves.mockResolvedValue([{ evaluation: -4, mate: null, moves: ['e4e5'], depth: 12 }, { evaluation: -400, mate: null, moves: ['f4g5'], depth: 13 }]);
    const p = await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH);
    expect(p?.search?.depthReached).toBe(12);
  });
});

describe('a deeper price search is bounded by the budget left (Learn speed, 2026-10-20)', () => {
  // 133 sits on a band edge, so the price deepens. A depth-18 search on two
  // moves ran 30 s under the question hold; each deeper search now carries
  // the budget that is left, and stops there.
  it('every deeper search carries a budget no larger than the deepening budget', async () => {
    await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH);
    const deeperCalls = scoreMoves.mock.calls.slice(1);
    expect(deeperCalls.length).toBeGreaterThan(0);
    for (const c of deeperCalls) {
      expect(typeof c[3]).toBe('number');
      expect(c[3]).toBeGreaterThan(0);
      expect(c[3]).toBeLessThanOrEqual(PRICE_DEEPEN_BUDGET_MS);
    }
  });
  it('a search the budget cut short that got no deeper keeps the price', async () => {
    scoreMoves.mockReset();
    scoreMoves.mockResolvedValueOnce(ONE_SEARCH.map((l) => ({ ...l, depth: 14 })));
    // Asked for depth 16, stopped at 14: not a deeper read.
    scoreMoves.mockResolvedValueOnce([{ evaluation: -4, mate: null, moves: ['e4e5'], depth: 14 }, { evaluation: -400, mate: null, moves: ['f4g5'], depth: 14 }]);
    const p = await liveMovePrice(KG5, 'f4g5', SHALLOW_FAN, COACH_TURN_DEPTH);
    expect(p?.costCp).toBe(133);
    expect(p?.search).toMatchObject({ depthReached: 14, deepened: false });
  });
});

describe('the label is graded from the price\'s own two scores', () => {
  it('a separate read after the move no longer decides the word', () => {
    // A different read says White stands +7 after Kg5. "after + cost" built a
    // before of +8.3 out of two searches and called the move fine; the price's
    // own scores (-0.04 → -1.37) make it a mistake.
    const v = callInaccuracyDetailed({
      namesBetterMove: false,
      fenBefore: KG5, playedSan: 'Kg5', bestSan: 'e5', bestLineUci: ['e4e5'],
      cpLoss: 133, missedMate: null, bestMate: null, allowedMate: null,
      moverEvalAfterCp: 700,
      scores: { bestWhiteCp: -4, playedWhiteCp: -137 },
      side: 'student', moverColor: 'white',
      replyLineUci: [], replySan: null, replyKeptWin: null, priorMove: null,
    });
    expect(v.declined).not.toBe('quality-not-worth-saying');
  });
});
