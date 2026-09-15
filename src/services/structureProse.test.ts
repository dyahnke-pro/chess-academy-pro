// The structure atoms must reach the student as ENGLISH, from their seat — the
// defect David read off a real prod review transcript on 2026-09-15
// ("Isolated pawn white a3." / "Black knight outpost d4." to a Black player).
import { describe, it, expect } from 'vitest';
import { renderStructureAtoms, parseStructureAtom } from './structureProse';

describe('structureProse — seat-correct English, never the machine inventory', () => {
  it('an isolated pawn of the student is "your", of the opponent "their"', () => {
    expect(renderStructureAtoms(['isolated pawn white a3'], 'b')).toBe('Their a3-pawn is isolated.');
    expect(renderStructureAtoms(['isolated pawn white a3'], 'w')).toBe('Your a3-pawn is isolated.');
  });
  it('groups same-side same-kind atoms instead of repeating the label', () => {
    expect(renderStructureAtoms(['passed pawn black a7', 'passed pawn black b7'], 'b'))
      .toBe('Your pawns on a7 and b7 are passed.');
  });
  it('names an outpost as a piece doing a job, never "Black knight outpost d4"', () => {
    const out = renderStructureAtoms(['Black knight outpost d4'], 'w');
    expect(out).toBe('Their knight sits on an outpost at d4.');
    expect(out).not.toMatch(/\bBlack\b/);
  });
  it('open files and doubled pawns read as sentences', () => {
    expect(renderStructureAtoms(['open file c'], 'w')).toBe('The c-file is open.');
    expect(renderStructureAtoms(['doubled pawn white a-file'], 'w')).toBe('Your pawns are doubled on the a-file.');
  });
  it('with no student seat it names the colour possessively, never bare', () => {
    expect(renderStructureAtoms(['isolated pawn white a3'], null)).toBe("White's a3-pawn is isolated.");
  });
  it('joins several clauses and never drops an unparsed atom', () => {
    const out = renderStructureAtoms(['open file c', 'something unmodelled'], 'w');
    expect(out).toContain('The c-file is open');
    expect(out).toContain('something unmodelled');
  });
  it('parses every atom shape describeStructure emits', () => {
    for (const a of ['open file e', 'passed pawn white d5', 'isolated pawn black c6', 'doubled pawn black f-file', 'White bishop outpost e5']) {
      expect(parseStructureAtom(a), a).not.toBeNull();
    }
  });
});
