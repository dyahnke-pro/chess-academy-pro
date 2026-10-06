import { describe, expect, it } from 'vitest';
import { advantageWasMissed } from './coachFeatureService';

// KID review 2026-10-06: their 15.Kg1 was answered with "Here's how you take
// advantage: knight takes f1" — the move the student missed with 15…Qh4.
describe('advantageWasMissed — never hand over the move the student had to find', () => {
  it('holds the line when the student played something else', () => {
    expect(advantageWasMissed('Qh4', 'Nxf1')).toBe(true);
  });
  it('names it when the student found it (check marks aside)', () => {
    expect(advantageWasMissed('Nxf1+', 'Nxf1')).toBe(false);
  });
  it('nothing known → nothing held', () => {
    expect(advantageWasMissed(null, 'Nxf1')).toBe(false);
    expect(advantageWasMissed('Qh4', null)).toBe(false);
  });
});
