// TEACHING POINTS FIRST (David 2026-09-23) — the support rule, and the door's
// step 4b that runs it on review's tagged facts.
import { describe, it, expect } from 'vitest';
import { supportedFacts } from './factSelector';
import { FACET_ROLE, facetTag } from './reviewFacetRank';

const roleOf = (t: string): 'teach' | 'describe' => { const tag = facetTag(t); return tag === null ? 'teach' : FACET_ROLE[tag]; };
const isMoveReason = (t: string): boolean => facetTag(t) === 'does';

describe('supportedFacts — a description speaks only where it supports a teaching point', () => {
  const tactic = '[tactic] Your knight forks the king on e8 and the rook on a8.';
  const countOnE8 = '[count] The king on e8 has one defender left.';
  const structure = '[structure] Your pawns on the queenside are connected.';
  const squares = new Map<string, string[]>([
    [tactic, ['c7', 'e8', 'a8']],
    [countOnE8, ['e8']],
    [structure, ['a2', 'b2', 'c2']],
  ]);

  it('keeps a description that points at a square the teaching point named', () => {
    const r = supportedFacts([tactic, countOnE8], squares, roleOf, isMoveReason);
    expect(r.spoken).toEqual([tactic, countOnE8]);
    expect(r.quiet).toEqual([]);
  });

  it('silences a description about somewhere else, and says why', () => {
    const r = supportedFacts([tactic, structure], squares, roleOf, isMoveReason);
    expect(r.spoken).toEqual([tactic]);
    expect(r.quiet).toEqual([{ text: structure, why: 'unsupported' }]);
  });

  it('a description with no coupled squares cannot be shown to support anything', () => {
    const eval_ = '[eval] The engine likes your position a little more now.';
    const r = supportedFacts([tactic, eval_], squares, roleOf, isMoveReason);
    expect(r.spoken).toEqual([tactic]);
    expect(r.quiet.map((q) => q.why)).toEqual(['unsupported']);
  });

  it('on a ply with NO teaching point, the move\'s own reason is the one line — never silence', () => {
    const does = '[does] It develops the knight toward the centre and eyes e5.';
    const r = supportedFacts([structure, does], squares, roleOf, isMoveReason);
    expect(r.spoken).toEqual([does]);
    expect(r.quiet).toEqual([{ text: structure, why: 'unsupported' }]);
  });

  it('is a ROLE rule, not a cap — every teaching point speaks, however many', () => {
    const teach = Array.from({ length: 7 }, (_, i) => `[threat] Threat number ${i} on the board.`);
    const r = supportedFacts(teach, new Map(), roleOf, isMoveReason);
    expect(r.spoken).toEqual(teach);
  });

  it('untagged prose (the causal-chain lead) counts as teaching', () => {
    const lead = 'Because you moved the bishop, the knight lost its only defender.';
    expect(supportedFacts([lead], new Map(), roleOf, isMoveReason).spoken).toEqual([lead]);
  });
});
