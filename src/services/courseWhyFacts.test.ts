import { describe, it, expect } from 'vitest';
import { frequencyTier, frequencyWhyFact, sublineWhyFact } from './courseWhyFacts';
import type { CourseSubline } from './openingCourse';

describe('frequencyTier', () => {
  it('classifies by share of master play', () => {
    expect(frequencyTier(73)).toBe('dominant');
    expect(frequencyTier(50)).toBe('dominant');
    expect(frequencyTier(30)).toBe('common');
    expect(frequencyTier(12)).toBe('minor');
    expect(frequencyTier(4)).toBe('rare');
  });
});

describe('frequencyWhyFact — selective rule', () => {
  it('voices a fact for a DOMINANT try (adds value)', () => {
    const f = frequencyWhyFact(73, 5000);
    expect(f.tier).toBe('dominant');
    expect(f.text).toContain('73%');
    expect(f.text.length).toBeGreaterThan(0);
  });

  it('voices a fact for a RARE try (surprise / preparedness)', () => {
    const f = frequencyWhyFact(4, 200);
    expect(f.tier).toBe('rare');
    expect(f.text).toContain('4%');
  });

  it('stays SILENT for common/minor moves (no robotic per-move stat)', () => {
    expect(frequencyWhyFact(30, 2000).text).toBe('');
    expect(frequencyWhyFact(12, 800).text).toBe('');
  });

  it('rotates stems so repeats vary', () => {
    const a = frequencyWhyFact(73, 5000, 0).text;
    const b = frequencyWhyFact(73, 5000, 1).text;
    expect(a).not.toBe(b);
  });

  it('always carries the structured facts even when text is empty', () => {
    const f = frequencyWhyFact(30, 2000);
    expect(f).toMatchObject({ pct: 30, games: 2000, tier: 'common', text: '' });
  });
});

describe('sublineWhyFact', () => {
  it('derives the why-fact from a subline', () => {
    const s: CourseSubline = {
      triggerMove: 'h4', name: 'Advance, Tal Variation', pct: 55, games: 5055,
      moves: ['e4', 'c6'], atPly: 4, reachesMiddlegame: true,
    };
    const f = sublineWhyFact(s);
    expect(f.tier).toBe('dominant');
    expect(f.text).toContain('55%');
  });
});
