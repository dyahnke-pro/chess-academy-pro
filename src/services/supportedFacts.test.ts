// TEACHING POINTS FIRST (David 2026-09-23) — the support rule, and the door's
// step 4b that runs it on review's tagged facts.
import { ALL_GREY } from './teachingLayers';
import { describe, it, expect } from 'vitest';
import { supportedFacts } from './factSelector';
import { FACET_ROLE, facetTag } from './reviewFacetRank';

const roleOf = (t: string): 'teach' | 'describe' => { const tag = facetTag(t); return tag === null ? 'teach' : FACET_ROLE[tag]; };

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
    const r = supportedFacts([tactic, countOnE8], squares, roleOf);
    expect(r.spoken).toEqual([tactic, countOnE8]);
    expect(r.quiet).toEqual([]);
  });

  it('silences a description about somewhere else, and says why', () => {
    const r = supportedFacts([tactic, structure], squares, roleOf);
    expect(r.spoken).toEqual([tactic]);
    expect(r.quiet).toEqual([{ text: structure, why: 'unsupported' }]);
  });

  it('a description with no coupled squares cannot be shown to support anything', () => {
    const eval_ = '[eval] The engine likes your position a little more now.';
    const r = supportedFacts([tactic, eval_], squares, roleOf);
    expect(r.spoken).toEqual([tactic]);
    expect(r.quiet.map((q) => q.why)).toEqual(['unsupported']);
  });

  it('on a ply with NO teaching point, nothing speaks — a description is not a reason (WO-TEACH-02)', () => {
    const does = '[does] It develops the knight toward the centre and eyes e5.';
    const r = supportedFacts([structure, does], squares, roleOf);
    expect(r.spoken).toEqual([]);
    expect(r.quiet.map((q) => q.why)).toEqual(['unsupported', 'unsupported']);
  });

  it('is a ROLE rule, not a cap — every teaching point speaks, however many', () => {
    const teach = Array.from({ length: 7 }, (_, i) => `[threat] Threat number ${i} on the board.`);
    const r = supportedFacts(teach, new Map(), roleOf);
    expect(r.spoken).toEqual(teach);
  });

  it('untagged prose (the causal-chain lead) counts as teaching', () => {
    const lead = 'Because you moved the bishop, the knight lost its only defender.';
    expect(supportedFacts([lead], new Map(), roleOf).spoken).toEqual([lead]);
  });
});

// ONE COACH (David 2026-09-23: "Review should rank the same way as learn! And
// play!"). The live composer hands the door clauses, not `[tag]` facets; their
// role rides the clause KIND in `family`. Same rule, second vocabulary.
describe('decide — teaching points first on the LIVE vocabulary too', async () => {
  const { decide } = await import('./coachDecider');
  const { NO_BOOST } = await import('./studentMomentBoost');
  const { CLAUSE_ROLE } = await import('./reviewFacetRank');
  const student = { rating: 1500, weaknesses: [], need: null, momentBoost: NO_BOOST, layers: ALL_GREY };
  const blunder = { decision: null, cpLossCp: 300, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
  const HANG = 'Your knight on f3 is hanging to the bishop on g4.';
  const LEANS_HERE = 'Their bishop on g4 is doing all the work.';
  const LEANS_ELSEWHERE = 'Your rook on a1 is carrying your whole position.';
  const live = (facts: string[], kinds: Record<string, string>, sq: Record<string, string[]>) => ({
    facts,
    squares: new Map(Object.entries(sq)),
    family: new Map(Object.entries(kinds)),
  });

  it('a leans line speaks beside the teaching point it supports, and not beside one it does not', () => {
    const d = decide(blunder, student, live(
      [HANG, LEANS_HERE, LEANS_ELSEWHERE],
      { [HANG]: 'must-defend', [LEANS_HERE]: 'opponent-leans', [LEANS_ELSEWHERE]: 'student-leans' },
      { [HANG]: ['f3', 'g4'], [LEANS_HERE]: ['g4'], [LEANS_ELSEWHERE]: ['a1'] },
    ), 'interrupt');
    expect(d.spoken).toEqual([HANG, LEANS_HERE]);
    expect(d.quiet.find((q) => q.text === LEANS_ELSEWHERE)?.why).toBe('unsupported');
  });

  it('a ply of descriptions alone says nothing — and names the gate', () => {
    const d = decide(blunder, student, live(
      [LEANS_ELSEWHERE], { [LEANS_ELSEWHERE]: 'student-leans' }, { [LEANS_ELSEWHERE]: ['a1'] },
    ), 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('unsupported');
  });

  it('the band-change status line is teaching, so it survives on its own', () => {
    expect(CLAUSE_ROLE.status).toBe('teach');
    const STATUS = "You're winning this now — technique from here.";
    const d = decide(blunder, student, live([STATUS], { [STATUS]: 'status' }, {}), 'interrupt');
    expect(d.spoken).toEqual([STATUS]);
  });
});
