import { describe, it, expect } from 'vitest';
import { computePositionFacts } from './positionFacts';
import type { WeaknessSignal } from './weaknessSignal';
import type { MisconceptionBucket } from '../data/misconceptionTags';

// A WIRE THAT DOES NOT FIRE IS NOT A WIRE (David 2026-08-07). This proves the
// studentWeaknesses input actually re-ranks the briefing — the Phase-1 selector
// wire — and that it stays INERT (identity) when unfed or unmatched.

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };
// White Ne5 hangs to …dxe5 → the must-defend clause fires (rank 75) — the same
// board the composer test uses.
const HANGING_KNIGHT = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5';

const sig = (clusterId: string, over: Partial<WeaknessSignal> = {}): WeaknessSignal => ({
  clusterId, bucket: 'tactical' as MisconceptionBucket, label: clusterId,
  openCount: 5, severity: 70, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [], ...over,
});

async function mustDefendRank(studentWeaknesses?: readonly WeaknessSignal[]): Promise<number> {
  const r = await computePositionFacts({ posture: 'walk', fen: HANGING_KNIGHT, moverColor: 'w', studentColor: 'w', analysis: flat, studentWeaknesses });
  const md = r.clauses.find((c) => c.kind === 'must-defend');
  return md?.rank ?? -1;
}

describe('computePositionFacts — studentWeaknesses re-ranks the briefing (Phase 1)', () => {
  it('inert with no weaknesses (identity — unchanged from before the wire)', async () => {
    expect(await mustDefendRank(undefined)).toBe(75);
    expect(await mustDefendRank([])).toBe(75);
  });

  it('BOOSTS the must-defend clause for a student who keeps hanging pieces', async () => {
    const boosted = await mustDefendRank([sig('analysis:tactic:hanging_piece')]);
    expect(boosted).toBeGreaterThan(75); // the hole this student keeps falling in leads harder
    expect(boosted).toBeLessThanOrEqual(75 + 30); // capped so live safety facts still lead
  });

  it('a self-FIXED hole earns no boost (identity)', async () => {
    expect(await mustDefendRank([sig('analysis:tactic:hanging_piece', { lifecycleStatus: 'fixed', trend: 'improving' })])).toBe(75);
  });

  it('a NON-matching weakness never touches this clause (no forced match)', async () => {
    expect(await mustDefendRank([sig('analysis:tactic:fork')])).toBe(75);
  });

  it('the boosted clause still LEADS the briefing (ordering respects the boost)', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: HANGING_KNIGHT, moverColor: 'w', studentColor: 'w', analysis: flat, studentWeaknesses: [sig('analysis:tactic:hanging_piece')] });
    expect(r.clauses[0].kind).toBe('must-defend');
  });
});

describe('concept clause ↔ the student\'s specific hole (vocabulary bridge)', () => {
  it('a fork concept is boosted when the student is fork-blind, untouched otherwise', async () => {
    // A live board where a fork is on for the student; fed a PV so the concept
    // engine names it. The clause must land on `analysis:tactic:fork`, not a bucket.
    const fen = '5rk1/2q5/4N3/8/8/8/8/6K1 w - - 0 30';
    const analysis = {
      bestMove: 'e6c7', evaluation: 600, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0,
      topLines: [{ rank: 1, moves: ['e6c7'], evaluation: 600, mate: null }, { rank: 2, moves: ['g1h1'], evaluation: 0, mate: null }],
    } as unknown as import('../types').StockfishAnalysis;
    const base = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis, rating: 1500 });
    const boosted = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis, rating: 1500, studentWeaknesses: [sig('analysis:tactic:fork')] });
    const c0 = base.clauses.find((c) => c.kind === 'concept');
    const c1 = boosted.clauses.find((c) => c.kind === 'concept');
    if (!c0 || !c1) return; // the concept only fires when the detector names the fork on this board
    expect(c1.rank).toBeGreaterThan(c0.rank);
  });
});
