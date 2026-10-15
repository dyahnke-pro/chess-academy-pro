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
    const first = renderFundamentalVerdict([attr('same-piece-twice')], { replySan: null, ply: 12, seen });
    expect(first).toContain("Here's how:");
    const again = renderFundamentalVerdict([attr('same-piece-twice')], { replySan: null, ply: 20, seen });
    expect(again).not.toContain("Here's how:");
  });

  it('two NEW fundamentals on one ply: the lead teaches its habit, the second waits for its own turn (David 2026-10-14: one lead reason per turn)', () => {
    const seen = new Set<FundamentalId>();
    const out = renderFundamentalVerdict([attr('same-piece-twice'), attr('loose-piece')], { replySan: null, ply: 12, seen });
    const first = (id: FundamentalId): string => (fundamentalHow(id) ?? '__').split(/(?<=[.!?])\s+/)[0];
    expect(out).toContain(first('same-piece-twice'));
    expect(out).not.toContain(first('loose-piece'));
    expect(out.match(/Here's how:|The habit that fixes it:|Next time:/g) ?? []).toHaveLength(1);
    // The second was not said — its full lesson is still owed.
    expect(seen.has('loose-piece')).toBe(false);
    const later = renderFundamentalVerdict([attr('loose-piece')], { replySan: null, ply: 20, seen });
    expect(later).toContain(first('loose-piece'));
  });

  it('uses the student/opponent perspective, never we/our', () => {
    const banned = ALL.filter((id) => /\b(we|our|us|we're|we'll)\b/i.test(fundamentalHow(id) ?? ''));
    expect(banned, `we/our in: ${banned.join(', ')}`).toEqual([]);
  });
});

describe('the remedy follows the fact (WO-STANDARD-01 D-5, 2026-09-22)', () => {
  it('a bishop buried by the student\'s own KING gets a piece remedy, not the pawn one', () => {
    const how = fundamentalHow('buried-own-bishop', { bishop: 'f1', blocker: 'e2', blockerPiece: 'king' })!;
    expect(how).toMatch(/park a king in front of your own bishop/);
    expect(how).not.toMatch(/pawn move/);
  });
  it('NEGATIVE CONTROL: buried by a pawn, the pawn remedy stands', () => {
    expect(fundamentalHow('buried-own-bishop', { bishop: 'c1', blocker: 'd2', blockerPiece: 'pawn' })).toMatch(/Before a pawn move/);
    expect(fundamentalHow('buried-own-bishop')).toMatch(/Before a pawn move/);
  });
  it('the king-walk verdict names castling as the loss', () => {
    const a = { id: 'king-left-in-centre', facts: { walked: 'e2', better: 'c3' }, evidence: { moves: ['c3'], pvMoves: [] } } as never as PrincipleAttribution;
    const out = renderFundamentalVerdict([a], { replySan: null, ply: 8, seen: new Set() });
    expect(out).toMatch(/castl/i);
    expect(out).toMatch(/e2/);
    expect(out).not.toMatch(/undefined/);
  });
});
