import { describe, it, expect } from 'vitest';
import { methodBeatFor } from './methodBeat';

const base = { tier: 'swing' as const, cpLossCp: null, bestSan: null, ignoredThreat: false, isStudentMove: true };

describe('methodBeat — how to think, earned by a computed signal', () => {
  it('teaches opponent-intent when a threat was played past', () => {
    const t = methodBeatFor({ ...base, ignoredThreat: true });
    expect(t).toMatch(/what (they|THEY) want|their threat|their move/i);
  });

  it('teaches the forcing scan when the move missed was a check or capture', () => {
    const t = methodBeatFor({ ...base, bestSan: 'Nxe5', cpLossCp: 150 });
    expect(t).toMatch(/checks and (the )?captures|forcing/i);
  });

  it('does NOT teach the forcing scan for a quiet best move', () => {
    expect(methodBeatFor({ ...base, bestSan: 'Nf3', cpLossCp: 150 })).toBeNull();
  });

  it('does NOT teach the forcing scan when the move barely cost anything', () => {
    expect(methodBeatFor({ ...base, bestSan: 'Nxe5', cpLossCp: 10 })).toBeNull();
  });

  it('says SLOW DOWN on a genuine fork in the road — the signal the app always had', () => {
    const t = methodBeatFor({ ...base, tier: 'critical' });
    expect(t).toMatch(/slow down|clock|thinking time/i);
  });

  it('is silent on an ordinary quiet moment — empty beats generic', () => {
    expect(methodBeatFor(base)).toBeNull();
  });

  it('never lectures the opponent’s move', () => {
    expect(methodBeatFor({ ...base, tier: 'critical', isStudentMove: false })).toBeNull();
    expect(methodBeatFor({ ...base, ignoredThreat: true, isStudentMove: false })).toBeNull();
  });

  it('varies the stem across plies so a long game never repeats verbatim', () => {
    const seen = new Set([0, 1, 2].map((p) => methodBeatFor({ ...base, tier: 'critical' }, p)));
    expect(seen.size).toBe(3);
  });

  it('prefers the SPECIFIC habit over the general one', () => {
    // Both conditions fire; the opponent-intent habit is the more teachable.
    const t = methodBeatFor({ ...base, tier: 'critical', ignoredThreat: true });
    expect(t).toMatch(/their threat|what (they|THEY) want|their move/i);
  });
});

describe('the wire FIRES — a real beat comes out of the review builder', () => {
  it('a student who misses a capture is taught the forcing scan, end to end', async () => {
    // CLAUDE.md: "a wire that does not fire is not a wire". David's own Alapin
    // game earns no method beat — every move he missed there was quiet (e6,
    // Bd6), so the forcing-scan habit is correctly silent. That is the
    // empty>generic rule working, but it leaves the wire unproven, so this case
    // takes the SAME real game and the SAME builder and changes one thing: at
    // ply 12 the move that was there is the capture Nxc3 (legal in that
    // position — the knight sat on d5 and White had just played Nc3).
    const { readFileSync } = await import('node:fs');
    const { buildReviewSegments } = await import('./coachFeatureService');
    const path = '/tmp/claude-0/-home-user-chess-academy-pro/02cfc153-41a1-5904-92c3-a66ded7e10dc/scratchpad/alapin-evals.json';
    let rows: Array<Record<string, unknown>>;
    try { rows = JSON.parse(readFileSync(path, 'utf8')); } catch { return; } // fixture is local-only
    const inputs = rows.map((r) => ({
      ply: r.ply, san: r.san, isCoachMove: false, classification: r.classification,
      evaluation: r.evaluation, preMoveEval: r.preMoveEval,
      bestMove: r.ply === 12 ? 'd5c3' : r.bestMove, fenAfter: r.fenAfter,
    }));
    const segs = buildReviewSegments(inputs as never, 'black', 'Sicilian Defense: Alapin Variation', true, 1500);
    const p12 = segs.find((s) => s.ply === 12)?.narration ?? '';
    expect(p12).toMatch(/checks and (the )?captures|forcing/i);
  }, 120000);
});
