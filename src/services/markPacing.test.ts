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

// David 2026-11-08: "Make sure ALL stated squares pieces moves are covered …
// they ALL appear AS THEY ARE STATED!"
describe('every mark appears at the words that state it', () => {
  it('a piece named by its words lights its square there, not at the turn end', () => {
    const text = 'You play Nf3. Their queen has nowhere to go now. Keep the pressure on.';
    const ev = scheduleMarks(text, [{ id: 'q', squares: ['d8'], words: ['their queen', 'the queen'] }]);
    expect(ev.find((e) => e.kind === 'show')?.atMs).toBe(text.indexOf('Their queen') * MS_PER_CHAR);
  });
  it("a line said by its shape draws its unnamed moves right after the one before, in order", () => {
    const text = 'That walks into a tactic: they play Nxd4 and, two moves later, they play Rfxc8. They win a bishop.';
    const marks = [
      { id: 'p0', squares: ['d4', 'c6'], group: 'l0' },
      { id: 'p1', squares: ['d4', 'e3'], group: 'l0' },
      { id: 'p2', squares: ['b5', 'c6'], group: 'l0' },
      { id: 'p3', squares: ['c8', 'f8'], group: 'l0' },
    ];
    const ev = scheduleMarks(text, marks);
    const at = (id: string): number => (ev.find((e) => e.kind === 'show' && e.id === id)?.atMs ?? -1);
    expect(at('p0')).toBe(text.indexOf('d4') * MS_PER_CHAR);
    expect(at('p1')).toBeGreaterThan(at('p0'));
    expect(at('p1')).toBeLessThan(text.indexOf('They win') * MS_PER_CHAR);
    expect(at('p3')).toBe(text.indexOf('c8') * MS_PER_CHAR);
    expect(at('p2')).toBeGreaterThan(at('p1'));
    // …never at the turn's last sentence, as an unnamed mark used to go.
    expect(at('p2')).toBeLessThan(text.indexOf('They win') * MS_PER_CHAR);
  });
  it('castling is announced by the word', () => {
    const text = 'Get your king safe first. Then castle, and the rook joins.';
    const ev = scheduleMarks(text, [{ id: 'k', squares: ['g1', 'e1'], words: ['castles', 'castle'] }]);
    expect(ev.find((e) => e.kind === 'show')?.atMs).toBe(text.indexOf('castle,') * MS_PER_CHAR);
  });
});
