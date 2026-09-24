import { describe, it, expect, afterEach } from 'vitest';
import { openingAnnouncement } from './openingAnnouncement';
import { bookDeparture } from './bookDeparture';
import { __setLocalDbForTests } from './masterPlayLookup';
import { Chess } from 'chess.js';

// Prod Learn tape 2026-09-24: four announcements in ten plies, each the
// detector refining its guess. One on first identification, one where the
// game leaves book — and "left book" means left what masters PLAY.
const dep = (ply: number, san: string, mover: 'w' | 'b', mainSan: string | null) => ({ ply, san, mover, mainSan });

describe('openingAnnouncement — name it once, then once more where theory ends', () => {
  it('names the first identification', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense' }, null, null, 'w')).toBe('This game is the Scandinavian Defense.');
  });
  it('a refinement while still in book says nothing', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Main Line' }, null, 'Scandinavian Defense', 'w')).toBeNull();
  });
  it('says WHO left the book and the usual move there', () => {
    expect(openingAnnouncement({ name: 'Philidor Defense' }, dep(8, 'Be7', 'b', 'Nf6'), 'King\'s Pawn Game', 'w'))
      .toBe('They left the book with the bishop to e7; the usual move there was the knight to f6. The line was the Philidor Defense.');
    expect(openingAnnouncement({ name: 'Philidor Defense' }, dep(7, 'Bd3', 'w', 'Nxd4'), 'King\'s Pawn Game', 'w'))
      .toMatch(/^You left the book with/);
  });
  it('never repeats a name already said', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense' }, dep(5, 'a3', 'w', null), 'Scandinavian Defense', 'w')).toBeNull();
    expect(openingAnnouncement(null, null, null, 'w')).toBeNull();
  });
});

describe('bookDeparture reads theory from the MASTERS DB (hand walk 2026-09-24)', () => {
  afterEach(() => __setLocalDbForTests(null));
  const history = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Be7'];
  function mastersFor(line: string[], games: Record<number, Array<{ san: string; games: number }>>) {
    const positions: Record<string, Array<{ san: string; games: number }>> = {};
    const b = new Chess();
    line.forEach((san, i) => { positions[b.fen().split(' ').slice(0, 4).join(' ')] = games[i] ?? [{ san, games: 500 }]; b.move(san); });
    return { positions };
  }
  it('THE WALK: 4.Nxd4 is main-line theory — the student did not leave book', () => {
    __setLocalDbForTests(mastersFor(history, { 7: [{ san: 'Nf6', games: 900 }, { san: 'Be7', games: 300 }] }));
    expect(bookDeparture(history)).toBeNull();
  });
  it('a move masters rarely play is the departure, with its mover and the usual move', () => {
    __setLocalDbForTests(mastersFor(history, { 7: [{ san: 'Nf6', games: 900 }, { san: 'Be7', games: 3 }] }));
    expect(bookDeparture(history)).toEqual({ ply: 8, san: 'Be7', mover: 'b', mainSan: 'Nf6' });
  });
});

describe('bookDeparture without the masters DB claims nothing', () => {
  it('a name-DB miss is not evidence of leaving book (the DB is sparse)', () => {
    __setLocalDbForTests(null);
    expect(bookDeparture(['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Be7'])).toBeNull();
  });
});
