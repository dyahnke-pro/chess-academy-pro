import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples, type FundamentalId } from './principleAttribution';
import type { PrincipleAttribution } from './principleAttribution';
import { renderFundamentalVerdict, renderFundamentalsRecap, renderPvEvidence } from './principleVoice';

const ALAPIN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6';
const SANS = (() => { const c = new Chess(); c.loadPgn(ALAPIN); return c.history(); })();
const attrs = attributePrinciples({ historySans: SANS, bestSan: 'e6', classification: 'mistake' });

describe('principleVoice — deterministic DNA-register verdicts', () => {
  it('names only squares and moves the attributor proved', () => {
    const text = renderFundamentalVerdict(attrs, { replySan: null, ply: 12, seen: new Set() });
    expect(text.length).toBeGreaterThan(40);
    // The proven squares/moves are in the words; nothing else is invented.
    expect(text).toMatch(/d5/);
    expect(text).toMatch(/third/);
    // Student perspective: you/your, never we/our.
    expect(text).not.toMatch(/\b(we|our|us)\b/i);
    expect(text).toMatch(/\byour?\b/i);
  });

  it('is byte-identical for identical input (David: "this all needs to be deterministic")', () => {
    const a = renderFundamentalVerdict(attrs, { replySan: null, ply: 12, seen: new Set() });
    const b = renderFundamentalVerdict(attrs, { replySan: null, ply: 12, seen: new Set() });
    expect(a).toBe(b);
  });

  it('repeats a fundamental in a SHORT stem after it has spoken in full (G.4 — accumulate, do not nag)', () => {
    const seen = new Set<FundamentalId>();
    const first = renderFundamentalVerdict(attrs.slice(0, 1), { replySan: null, ply: 12, seen });
    const again = renderFundamentalVerdict(attrs.slice(0, 1), { replySan: null, ply: 20, seen });
    expect(again.length).toBeLessThan(first.length);
    expect(again).toMatch(/again/i);
  });

  it('speaks the engine line only when the attributor found it corroborating', () => {
    expect(renderPvEvidence(attrs)).toBeNull();
    const withPv = attrs.map((a, i) => (i === 0 ? { ...a, evidence: { ...a.evidence, pvMoves: ['d5'] } } : a));
    expect(renderPvEvidence(withPv)).toMatch(/engine's line.*d5/);
  });
});

describe('renderFundamentalsRecap — the aggregate is the lesson', () => {
  const tempo = attrs.find((a) => a.id === 'tempo-handed')!;
  const twice = attrs.find((a) => a.id === 'same-piece-twice')!;
  it('counts the most frequent fundamental across the flagged moves', () => {
    const text = renderFundamentalsRecap([[tempo, twice], [tempo], [], [tempo]], 5)!;
    expect(text).toMatch(/three of your five flagged moves handed over a tempo/i);
    expect(text).toMatch(/carry into the next game/i);
  });
  it('is null when nothing attached', () => {
    expect(renderFundamentalsRecap([[], []], 2)).toBeNull();
  });
  it('is deterministic', () => {
    const per = [[tempo, twice], [twice]];
    expect(renderFundamentalsRecap(per, 2)).toBe(renderFundamentalsRecap(per, 2));
  });
});

describe('the recap SUBJECT reads as English at every count', () => {
  // "The pattern: one of your one flagged move handed over a tempo." — read off
  // the live prod recap on 2026-09-17. The x-of-y shape divides a number by
  // itself when every flagged move shares the fault, and the result is not a
  // sentence. Each count below is a shape, not a number.
  const attrs = (n: number): PrincipleAttribution[][] =>
    Array.from({ length: n }, () => [{ id: 'tempo-handed', evidence: '' } as unknown as PrincipleAttribution]);

  it('one flagged move names it, never "one of your one"', () => {
    const text = renderFundamentalsRecap(attrs(1), 1);
    expect(text).toMatch(/your one flagged move handed over a tempo/i);
    expect(text).not.toMatch(/one of your one/i);
  });

  it('two, both sharing the fault, says both', () => {
    expect(renderFundamentalsRecap(attrs(2), 2)).toMatch(/both of your flagged moves/i);
  });

  it('three or more, all sharing it, says all three', () => {
    expect(renderFundamentalsRecap(attrs(3), 3)).toMatch(/all three of your flagged moves/i);
  });

  it('a genuine subset keeps the x-of-y shape', () => {
    expect(renderFundamentalsRecap(attrs(2), 5)).toMatch(/two of your five flagged moves/i);
  });

  it('never divides a number by itself, at any count', () => {
    for (let n = 1; n <= 6; n += 1) {
      const text = renderFundamentalsRecap(attrs(n), n) ?? '';
      expect(text, `n=${n}: ${text}`).not.toMatch(/\b(\w+) of your \1\b/i);
    }
  });
});
