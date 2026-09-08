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
  const r = await computePositionFacts({ fen: HANGING_KNIGHT, moverColor: 'w', studentColor: 'w', analysis: flat, studentWeaknesses });
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
    const r = await computePositionFacts({ fen: HANGING_KNIGHT, moverColor: 'w', studentColor: 'w', analysis: flat, studentWeaknesses: [sig('analysis:tactic:hanging_piece')] });
    expect(r.clauses[0].kind).toBe('must-defend');
  });
});
