import { describe, it, expect } from 'vitest';
import { scheduleMarks, MS_PER_CHAR } from './markPacing';

// David's Smith-Morra replay (2026-10-19): every mark lit when the turn began.
describe('marks appear as they are mentioned', () => {
  const text = 'Their bishop on g4 has nothing defending it. That wins a bishop and a pawn for a knight: Nhf6+, exf6 and Nxf6+.';
  const marks = [
    { id: 'hl-g4', squares: ['g4'] },
    { id: 'a1', squares: ['f6', 'h7'] },
    { id: 'a2', squares: ['f6', 'e7'] },
    { id: 'a3', squares: ['f6', 'd5'] },
  ];
  const ev = scheduleMarks(text, marks);
  const at = (id: string): number => (ev.find((e) => e.kind === 'show' && e.id === id)?.atMs ?? -1);
  it('nothing is shown at the start unless named there', () => {
    expect(at('hl-g4')).toBe(text.indexOf('g4') * MS_PER_CHAR);
    expect(at('hl-g4')).toBeGreaterThan(0);
  });
  it("a line's arrows appear one per mention, in order", () => {
    expect(at('a1')).toBe(text.indexOf('f6') * MS_PER_CHAR);
    expect(at('a2')).toBeGreaterThan(at('a1'));
    expect(at('a3')).toBeGreaterThan(at('a2'));
  });
  it('the next marked sentence clears the last one', () => {
    const clear = ev.find((e) => e.kind === 'clear');
    expect(clear?.atMs).toBe(text.indexOf('That wins') * MS_PER_CHAR);
  });
  it('a mark no sentence names still goes up, with the last sentence', () => {
    const e = scheduleMarks('Keep pushing. The rest follows.', [{ id: 'x', squares: ['c7'] }]);
    expect(e.find((v) => v.kind === 'show')?.atMs).toBe('Keep pushing. '.length * MS_PER_CHAR);
  });
});
