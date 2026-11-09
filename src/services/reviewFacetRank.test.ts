// The computer decides what is important — and with the hard caps gone
// (G4.5) the ORDER is the only thing left that does. David 2026-09-16.
import { describe, it, expect } from 'vitest';
import { facetTag, facetRank, FACET_RANK } from './reviewFacetRank';
import type { WeaknessSignal } from './weaknessSignal';

const hangingHole: WeaknessSignal = {
  clusterId: 'analysis:tactic:hanging_piece', capabilityTag: null, proven: false, bucket: 'tactical', label: 'Hanging pieces',
  openCount: 6, total: 6, severity: 80, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: ['hangingPiece'],
};

const QUALITY = '[quality] You: that was a blunder, costing about 3.1 points.';
const PLAN = '[plan-now] The plan from here is to seize the open d-file.';
const LOOSE = '[loose] Newly undefended: your knight on e2.';
const STRUCT = '[structure] Their a3-pawn is isolated.';

describe('reviewFacetRank — importance order', () => {
  it('recognises every tag it ranks, and rejects an unknown one', () => {
    for (const tag of Object.keys(FACET_RANK)) expect(facetTag(`[${tag}] x`)).toBe(tag);
    expect(facetTag('[not-a-real-tag] x')).toBeNull();
    expect(facetTag('no tag at all')).toBeNull();
  });

  it('what the move cost leads; the plan that follows trails', () => {
    const ranks = [PLAN, STRUCT, LOOSE].map((f) => facetRank(f));
    expect(Math.max(...ranks)).toBeLessThan(facetRank(QUALITY));
    expect(Math.min(...[STRUCT, LOOSE, QUALITY].map((f) => facetRank(f)))).toBeGreaterThan(facetRank(PLAN));
  });

  it('the causal-chain lead (untagged prose) always leads', () => {
    const chain = 'Your knight was left loose two moves ago, and this collects it.';
    expect(facetRank(chain)).toBeGreaterThan(facetRank(QUALITY));
  });

  it('a student hole lifts a COMPARABLE fact — and never vaults a plan over a blunder', () => {
    expect(facetRank(LOOSE, [hangingHole])).toBeGreaterThan(facetRank(LOOSE));
    expect(facetRank(LOOSE)).toBeGreaterThan(facetRank(STRUCT));
    // the boost is bounded, so the blunder still outranks a boosted plan
    expect(facetRank(QUALITY)).toBeGreaterThan(facetRank(PLAN, [hangingHole]));
  });

  it('an unranked facet is not silently mid-ranked — it is either known or leads', () => {
    // A tag nobody ranked would read as prose and lead the beat, which is loud
    // and therefore noticeable. Better than a silent default in the middle.
    expect(facetRank('[brand-new-tag] something')).toBe(1000);
  });
});
