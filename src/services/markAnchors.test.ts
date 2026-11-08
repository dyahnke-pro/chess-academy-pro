import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { markItems, pieceWords } from './markAnchors';
import { scheduleMarks, MS_PER_CHAR } from './markPacing';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('marks anchored to the words that name them', () => {
  it("a piece's words come from the one namer, longest first", () => {
    const words = pieceWords(new Chess().fen(), 'd8', 'w');
    expect(words[0]).toBe('their queen');
    expect(words).toContain('the queen');
    expect(pieceWords(new Chess().fen(), 'f2', 'w')).toContain('your f-pawn');
    expect(pieceWords(new Chess().fen(), 'e4', 'w')).toEqual([]);
  });
  it('a highlighted piece named only by its words lights where it is said (Learn lit it at the turn end)', () => {
    const fen = after('e4', 'e5', 'Nf3');
    const text = 'You develop with tempo. Their e-pawn needs a guard now.';
    const items = markItems({ fen, viewer: 'w', highlights: ['e5'], arrows: [] });
    const ev = scheduleMarks(text, items);
    expect(ev.find((e) => e.kind === 'show' && e.id === 'h0')?.atMs).toBe(text.indexOf('Their e-pawn') * MS_PER_CHAR);
  });
  it("a line's plies are grouped in order", () => {
    const items = markItems({ fen: new Chess().fen(), viewer: 'w', highlights: [], arrows: [], lines: [[{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5', fen: after('e4') }]] });
    expect(items.map((x) => [x.id, x.group])).toEqual([['l0.0', 'l0'], ['l0.1', 'l0']]);
  });
});
