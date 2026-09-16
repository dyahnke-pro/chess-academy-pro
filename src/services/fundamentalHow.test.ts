import { describe, it, expect } from 'vitest';
import { renderFundamentalVerdict, fundamentalHow } from './principleVoice';
import { FUNDAMENTAL_TAG } from './principleAttribution';
import type { PrincipleAttribution, FundamentalId } from './principleAttribution';

// ── EVERY DIAGNOSIS CARRIES ITS REMEDY ───────────────────────────────────────
// David 2026-09-16: "The plan plus here's how!!! The how is teaching!! How and
// why statements critical to this app's success!"
//
// Measured that hour: `deriveNextPlans` carried a HOW on 8/8 plans; this file —
// the DIAGNOSE layer, 33 named fundamentals with board proof — carried zero. It
// told the student what they broke and never how to stop.

const attr = (id: FundamentalId): PrincipleAttribution =>
  ({ id, facts: { piece: 'knight', nth: '3', homeMinors: '2', square: 'd5' }, evidence: { moves: ['Nxd5'], pvMoves: [] } }) as never;

const ALL = Object.keys(FUNDAMENTAL_TAG) as FundamentalId[];

describe('fundamentalHow — no diagnosis without a remedy', () => {
  it('the gate sees the real fundamental set (non-vacuous)', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(30);
  });

  it('EVERY fundamental has a how', () => {
    const missing = ALL.filter((id) => !fundamentalHow(id));
    expect(missing, `no "here's how" for: ${missing.join(', ')}`).toEqual([]);
  });

  it('a how is a PROCEDURE, not a restatement — it tells the student what to do', () => {
    // An imperative or a "before/when/ask" cue; never just a noun phrase.
    const notActionable = ALL.filter((id) => {
      const h = fundamentalHow(id) ?? '';
      return !/\b(ask|check|count|look|scan|before|when|keep|put|trade|develop|castle|prefer|find|spend|run|answer|price|clear|route|do not|don't|make sure|prepare|march|push|compare)\b/i.test(h);
    });
    expect(notActionable, `not actionable: ${notActionable.join(', ')}`).toEqual([]);
  });

  it('a how never invents a board claim (G0/G3 — it is a habit, not geometry)', () => {
    // No bare square coordinates: the verdict already proved the geometry, and a
    // fixed string cannot know this position.
    const withSquares = ALL.filter((id) => /\b[a-h][1-8]\b/.test(fundamentalHow(id) ?? ''));
    expect(withSquares, `names squares: ${withSquares.join(', ')}`).toEqual([]);
  });

  it('the how rides the FIRST appearance and never repeats', () => {
    const seen = new Set<FundamentalId>();
    const first = renderFundamentalVerdict([attr('same-piece-twice')], { ply: 12, seen });
    expect(first).toContain("Here's how:");
    const again = renderFundamentalVerdict([attr('same-piece-twice')], { ply: 20, seen });
    expect(again).not.toContain("Here's how:");
  });

  it('two NEW fundamentals on one ply both teach — the board earned both (G4.5)', () => {
    const seen = new Set<FundamentalId>();
    const out = renderFundamentalVerdict([attr('same-piece-twice'), attr('loose-piece')], { ply: 12, seen });
    expect(out.match(/Here's how:/g) ?? []).toHaveLength(2);
  });

  it('uses the student/opponent perspective, never we/our', () => {
    const banned = ALL.filter((id) => /\b(we|our|us|we're|we'll)\b/i.test(fundamentalHow(id) ?? ''));
    expect(banned, `we/our in: ${banned.join(', ')}`).toEqual([]);
  });
});
