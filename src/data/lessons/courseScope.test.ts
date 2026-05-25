import { describe, it, expect } from 'vitest';
import { buildCourseScope } from './index';

// Course-scope is what keeps the masterclass coach on the rails of the
// course the student is inside (David 2026-05-22). It's explicit (by tab),
// not text-matched — so it must produce a scoped system prompt + a greeting
// that names the course, from openingId (+ optional variation) alone.

describe('buildCourseScope', () => {
  it('scopes to a main line and names the course in the greeting + prompt', () => {
    const scope = buildCourseScope('caro-kann');
    expect(scope).not.toBeNull();
    expect(scope!.label).toBe('Caro-Kann Defence Main Line');
    expect(scope!.greeting).toContain('Caro-Kann Defence Main Line');
    expect(scope!.systemAddition).toContain('MASTERCLASS COURSE SCOPE');
    expect(scope!.systemAddition).toContain('Caro-Kann');
    // Black opening — the scope tells the coach which side the student plays.
    expect(scope!.systemAddition).toContain('black');
    // Carries the verified ideas so answers stay grounded.
    expect(scope!.systemAddition).toMatch(/Verified ideas/i);
    // Anchored to the position the line reaches (B2) — a real FEN, not move 1.
    expect(scope!.systemAddition).toMatch(/reaches this position/i);
    expect(scope!.systemAddition).toMatch(/\b[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8/]+ [wb] /);
  });

  it('scopes to a named variation', () => {
    const scope = buildCourseScope('ruy-lopez', 'Berlin Defense');
    expect(scope).not.toBeNull();
    expect(scope!.label).toBe('Ruy Lopez — Berlin Defense');
    expect(scope!.greeting).toContain('Berlin Defense');
    expect(scope!.systemAddition).toContain('white'); // Ruy = White opening
  });

  it('does not depend on message text — scope comes from the tab, not the ask', () => {
    // The whole point: under the Caro tab, a generic "what is the plan here?"
    // still anchors the coach to the Caro. The scope is built from the id.
    const scope = buildCourseScope('caro-kann', null);
    expect(scope!.systemAddition).toContain('Caro-Kann');
  });

  it('returns null for an unknown opening and empty id', () => {
    expect(buildCourseScope('not-a-real-opening')).toBeNull();
    expect(buildCourseScope(null)).toBeNull();
    expect(buildCourseScope(undefined)).toBeNull();
  });
});
