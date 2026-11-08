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
    const items = markItems({ fen: new Chess().fen(), viewer: 'w', highlights: [], arrows: [], lines: [{ moves: [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5', fen: after('e4') }] }] });
    expect(items.map((x) => [x.id, x.group])).toEqual([['l0.0', 'l0'], ['l0.1', 'l0']]);
  });
});

describe('marks never outlive their words (cutMarksWithWords)', () => {
  const fen = after('e4', 'e5', 'Nf3', 'Nf6', 'Bc4');
  it('a square named only in the cut words goes; one the kept words name stays', async () => {
    const { cutMarksWithWords } = await import('./markAnchors');
    const full = 'Your bishop on c4 eyes f7. Their knight on f6 is loose.';
    const out = cutMarksWithWords(full, 'Your bishop on c4 eyes f7.', { squares: ['c4', 'f7', 'f6'] }, fen, 'w');
    expect(out.squares).toEqual(['c4', 'f7']);
  });
  it('a square the fact describes without naming stays with its fact', async () => {
    const { cutMarksWithWords } = await import('./markAnchors');
    const full = 'Their king has only four squares. Their knight on f6 is loose.';
    const out = cutMarksWithWords(full, 'Their king has only four squares.', { squares: ['f8', 'f6'] }, fen, 'w');
    expect(out.squares).toEqual(['f8']);
  });
  it('a line said only in the cut words goes; a line the kept words say stays', async () => {
    const { cutMarksWithWords } = await import('./markAnchors');
    const full = 'Ng5 hits f7 twice. After Bxf7+ Ke7 you are a pawn up.';
    const out = cutMarksWithWords(full, 'Ng5 hits f7 twice.', { squares: [], lines: [{ sans: ['Ng5'] }, { sans: ['Bxf7+', 'Ke7'] }] }, fen, 'w');
    expect(out.lines?.map((l) => l.sans[0])).toEqual(['Ng5']);
  });
  it("a square described in words lights at its fact's sentence, not at the turn's end", () => {
    const text = 'You develop with tempo. Their king has only four squares now.';
    const said = 'Their king has only four squares now.';
    const ev = scheduleMarks(text, markItems({ fen, viewer: 'w', highlights: [{ square: 'f8', said }], arrows: [] }));
    expect(ev.find((e) => e.kind === 'show' && e.id === 'h0')?.atMs).toBe(text.indexOf(said) * MS_PER_CHAR);
  });
});
