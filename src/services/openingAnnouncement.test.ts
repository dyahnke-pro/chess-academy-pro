import { describe, it, expect, afterEach, vi } from 'vitest';
import { openingAnnouncement } from './openingAnnouncement';
import { bookDeparture } from './bookDeparture';
import { __setLocalDbForTests, lookupMasterPlay } from './masterPlayLookup';
import { masterPlayCache, positionFen } from './masterPlayCache';
import { Chess } from 'chess.js';

// Prod Learn tape 2026-09-24: four announcements in ten plies, each the
// detector refining its guess. One on first identification, one where the
// game leaves book — and "left book" means left what masters PLAY.
const dep = (ply: number, san: string, mover: 'w' | 'b', mainSan: string | null) => ({ ply, san, mover, mainSan });

describe('openingAnnouncement — name it once, then once more where theory ends', () => {
  it('names the first identification', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense' }, null, null, 'w')).toBe('This game is the Scandinavian Defense.');
  });
  it('a "Main Line" refinement while still in book says nothing', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Main Line' }, null, 'Scandinavian Defense', 'w')).toBeNull();
  });
  it('a NAMED variation while still in book is named (hand walk 2340: "c3 — the Alapin")', () => {
    expect(openingAnnouncement({ name: 'Sicilian Defense: Alapin Variation' }, null, 'Sicilian Defense', 'w'))
      .toBe("It's the Alapin Variation.");
  });
  it('filler tails are not variations (hand walk 2026-09-25)', () => {
    expect(openingAnnouncement({ name: 'Indian Defense: Normal Variation' }, null, 'Indian Defense', 'b')).toBeNull();
    expect(openingAnnouncement({ name: "King's Indian Defense: Rare Defenses" }, null, "King's Indian Defense", 'b')).toBeNull();
  });
  it('the first naming drops a filler tail, keeps a real one', () => {
    expect(openingAnnouncement({ name: 'Indian Defense: Normal Variation' }, null, null, 'b')).toBe('This game is the Indian Defense.');
    expect(openingAnnouncement({ name: 'Sicilian Defense: Alapin Variation' }, null, null, 'w')).toBe('This game is the Sicilian Defense: Alapin Variation.');
    expect(openingAnnouncement({ name: 'Ruy Lopez: Exchange Variation, Normal Variation' }, null, null, 'b')).toBe('This game is the Ruy Lopez: Exchange Variation.');
  });
  it('a family that sharpens is named (hand walk 2026-09-25: Indian → King\'s Indian)', () => {
    expect(openingAnnouncement({ name: "King's Indian Defense: Normal Variation" }, null, 'Indian Defense: Normal Variation', 'b'))
      .toBe("It's the King's Indian Defense.");
  });
  it('a name that is not a refinement of the spoken one stays quiet in book (a transposition)', () => {
    expect(openingAnnouncement({ name: 'French Defense' }, null, 'Sicilian Defense', 'w')).toBeNull();
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

// "live explorer with a cache" (David 2026-09-24): Learn never loads the 37 MB
// file. Each position is looked up live as it appears; bookDeparture reads the
// answers back from the lookup cache.
describe('bookDeparture reads the LIVE explorer answers from the cache', () => {
  const history = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Be7'];
  const fens = (() => { const c = new Chess(); const out = [c.fen()]; for (const s of history) { c.move(s); out.push(c.fen()); } return out; })();
  const live = (fen: string, moves: { san: string; games: number }[]) => ({
    fen: positionFen(fen), totalGames: moves.reduce((n, m) => n + m.games, 0), source: 'lichess-live' as const,
    moves: moves.map((m) => ({ ...m, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 })),
  });
  afterEach(() => { masterPlayCache.clear(); __setLocalDbForTests(null); });

  it('finds the departure with no local file loaded', () => {
    __setLocalDbForTests(null);
    history.forEach((san, i) => masterPlayCache.set(fens[i], live(fens[i], i === 7 ? [{ san: 'Nf6', games: 900 }] : [{ san, games: 500 }])));
    expect(bookDeparture(history)).toEqual({ ply: 8, san: 'Be7', mover: 'b', mainSan: 'Nf6' });
  });

  it('a position not looked up yet claims nothing (unknown ≠ out of book)', () => {
    __setLocalDbForTests(null);
    history.slice(0, 3).forEach((san, i) => masterPlayCache.set(fens[i], live(fens[i], [{ san, games: 500 }])));
    expect(bookDeparture(history)).toBeNull();
  });

  it('warming skips the 37 MB local file — only the explorer is asked', async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u) => { calls.push(u instanceof Request ? u.url : u.toString()); return new Response('{"moves":[],"topGames":[]}', { status: 200 }); });
    await lookupMasterPlay(fens[0], { triggeredBy: 'book-departure', skipLocalDb: true });
    expect(calls.some((u) => u.includes('openings-masters-db'))).toBe(false);
    vi.restoreAllMocks();
  });
});
