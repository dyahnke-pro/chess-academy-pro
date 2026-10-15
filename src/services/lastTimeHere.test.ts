// "Last time here" — the student's own costly departure from THIS position in
// another game, set against what they played this time. Negative-controlled: no
// row, a cheap departure, a different position and the game being played are
// all silent.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lastTimeHere } from './lastTimeHere';
import type { BookDepartureRow } from './bookDepartureWeakness';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 15, 12);
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
// Italian, Black to move after 3.Bc4: the student (Black) once played …Nd4.
const HERE = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
const row = (over: Partial<BookDepartureRow> = {}): BookDepartureRow => ({
  gameId: 'g-old', departurePly: 6, departedSan: 'Nd4', mainSan: 'Bc5', bookFen: HERE,
  evalCostCp: 120, openingId: null, playedAt: NOW - 3 * DAY, ...over,
});

describe('lastTimeHere', () => {
  it('kept to theory this time: names the old move, its cost, and the change', () => {
    const r = lastTimeHere(HERE, 'Bc5', [row()], 'g-now', NOW);
    expect(r?.text).toBe('Last time here you played Nd4 and it cost you about a point 3 days ago. This time you kept to theory.');
    expect(r?.repeated).toBe(false);
    expect(r?.key.startsWith('last-here:other:')).toBe(true);
  });

  it('a different move, not theory: "another way", never naming the book move', () => {
    const r = lastTimeHere(HERE, 'Nf6', [row()], 'g-now', NOW);
    expect(r?.text).toMatch(/This time you went another way\.$/);
    expect(r?.text).not.toMatch(/Bc5/);
  });

  it('the same move again: said as the repeat, counted when it recurs', () => {
    const r = lastTimeHere(HERE, 'Nd4', [row(), row({ gameId: 'g-older', playedAt: NOW - 30 * DAY })], 'g-now', NOW);
    expect(r?.repeated).toBe(true);
    expect(r?.text).toBe('Same move as last time here — Nd4 cost you about a point in that game 3 days ago, in 2 of your games.');
    expect(r?.key.startsWith('last-here:same:')).toBe(true);
  });

  it('negative controls: cheap, elsewhere, this game, or no rows → nothing', () => {
    expect(lastTimeHere(HERE, 'Bc5', [row({ evalCostCp: 20 })], 'g-now', NOW)).toBeNull();
    expect(lastTimeHere(fenAfter(['d4']), 'd5', [row()], 'g-now', NOW)).toBeNull();
    expect(lastTimeHere(HERE, 'Bc5', [row({ gameId: 'g-now' })], 'g-now', NOW)).toBeNull();
    expect(lastTimeHere(HERE, 'Bc5', [], 'g-now', NOW)).toBeNull();
  });

  it('the clocks never matter: the same board with other move counters still matches', () => {
    const clocks = HERE.replace(/ \d+ \d+$/, ' 4 9');
    expect(lastTimeHere(clocks, 'Bc5', [row()], 'g-now', NOW)).not.toBeNull();
  });
});
