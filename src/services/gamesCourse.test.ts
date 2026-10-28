// The one opening builder (WO-ALL-OPENINGS-01 P2) on a fixture database: the
// masters' main line, every real split a variation, the veto, the record view.
import { describe, it, expect } from 'vitest';
import type { LichessExplorerResult, OpeningRecord } from '../types';
import { buildGamesCourse, buildReplies, courseRecord } from './gamesCourse';

const mv = (san: string, n: number, blackPct = 0.4, white = 0.3) => ({
  uci: '', san, averageRating: 2400, white: Math.round(n * white), draws: n - Math.round(n * white) - Math.round(n * blackPct), black: Math.round(n * blackPct), game: null,
});
const answer = (moves: ReturnType<typeof mv>[]): LichessExplorerResult => ({
  white: moves.reduce((a, m) => a + m.white, 0), draws: moves.reduce((a, m) => a + m.draws, 0), black: moves.reduce((a, m) => a + m.black, 0),
  moves, topGames: [], opening: null,
});
const DB: Record<string, LichessExplorerResult> = {
  'e4 c5 a3': answer([mv('g6', 306), mv('Nc6', 121), mv('e6', 110), mv('d6', 20), mv('h5', 40, 0.1, 0.8)]),
  'e4 c5 a3 g6': answer([mv('b4', 200), mv('Nf3', 50)]),
};
const lookup = async (sans: readonly string[]) => DB[sans.join(' ')] ?? null;

describe('buildGamesCourse', () => {
  it('walks the masters\' line and makes every real split a variation', async () => {
    const c = (await buildGamesCourse(['e4', 'c5', 'a3'], 'black', { lookup }))!;
    expect(c.main.sans).toEqual(['e4', 'c5', 'a3', 'g6', 'b4']);
    expect(c.main.stop).toBe('thin');
    const splits = c.variations.map((v) => v.sans[v.from]);
    // …Nc6 (21%) and …e6 (19%) are splits; …d6 (3%) is not; …h5 loses in
    // practice for the student, so it is never taught; Nf3 (20%) is the
    // opponent's other choice and is.
    expect(splits).toEqual(['Nc6', 'e6', 'Nf3']);
    expect(c.results?.white).toBeGreaterThan(0);
  });
  it('a line the database never reached is the named line alone, said as thin', async () => {
    const c = (await buildGamesCourse(['e4', 'c5', 'b3'], 'black', { lookup }))!;
    expect(c.main.sans).toEqual(['e4', 'c5', 'b3']);
    expect(c.main.stop).toBe('thin');
    expect(c.variations).toEqual([]);
  });
  it('the veto: a main line leaving the student lost gives way to a student split that does not', async () => {
    const veto = async (fen: string) => (fen.includes('6p1') ? -300 : 20); // the …g6 line is "lost"
    const c = (await buildGamesCourse(['e4', 'c5', 'a3'], 'black', { lookup, veto }))!;
    expect(c.main.sans[3]).toBe('Nc6');
    expect(c.variations.some((v) => v.sans[3] === 'g6')).toBe(true);
  });
  it('an illegal named line builds nothing', async () => {
    expect(await buildGamesCourse(['e4', 'e4'], 'white', { lookup })).toBeNull();
  });
});

describe('courseRecord', () => {
  it('runs the main line on and fills the variations, named by their move', async () => {
    const c = (await buildGamesCourse(['e4', 'c5', 'a3'], 'black', { lookup }))!;
    const rec = courseRecord({ id: 'b20-x', name: 'Sicilian Defense: Mengarini Variation', pgn: 'e4 c5 a3', variations: null } as unknown as OpeningRecord, c);
    expect(rec.pgn).toBe('e4 c5 a3 g6 b4');
    expect(rec.variations?.[0].name).toMatch(/\(…Nc6\)$/);
    expect(rec.variations?.[0].explanation).toBe('…Nc6 — masters play it in 20% of the 597 games at that point.');
    expect(rec.variations?.[2].name).toMatch(/\(Nf3\)$/);
  });
});

describe('buildReplies — Chessable\'s shape: their every real reply, one answer for the student', () => {
  it('splits only on the opponent\'s moves, at 8%+ and 10+ games, each walked on', async () => {
    // Black (the student) plays …g6; White's replies at ply 4 are b4 (main)
    // and Nf3 (20%). …Nc6 / …e6 are the STUDENT's alternatives: never replies.
    const { replies, incomplete } = await buildReplies(['e4', 'c5', 'a3', 'g6', 'b4'], 3, 'black', { lookup });
    expect(incomplete).toBe(false);
    expect(replies.map((r) => r.triggerMove)).toEqual(['Nf3']);
    expect(replies[0]).toMatchObject({ atPly: 4, pct: 20, games: 50, moves: ['e4', 'c5', 'a3', 'g6', 'Nf3'] });
  });
  it('replies before `from` (outside the opening) are not taken', async () => {
    const { replies } = await buildReplies(['e4', 'c5', 'a3', 'g6', 'b4'], 5, 'black', { lookup });
    expect(replies).toEqual([]);
  });
});
