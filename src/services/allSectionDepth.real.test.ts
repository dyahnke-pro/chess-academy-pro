// WO-ALL-SECTION-DEPTH on the SHIPPED files (David 2026-11-08: "Stockfish's best
// moves fill the main line past the data floor; club games give the
// variations"): real All-section openings built with the page's own tiers —
// the stored trees, the engine lines (`/data/engine-lines/`) and the club
// index (`/data/club-tree/`) — read from public/ the way the phone reads them.
// Each case fails on the builder before the tiers (stored trees only).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const PUBLIC = join(process.cwd(), 'public');
vi.mock('./dataFile', () => ({
  loadDataJson: (path: string): Promise<unknown> => {
    const file = join(PUBLIC, path);
    return Promise.resolve(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown : null);
  },
}));

const { buildGamesCourse, isMiddlegameBoard, middlegamePly } = await import('./gamesCourse');
const { storedTreeAt, variationTreeAnswer } = await import('./deepTree');
const { engineLineAt, uciLineToSan } = await import('./engineLine');
const { clubRowToResult } = await import('./clubTree');
type Course = NonNullable<Awaited<ReturnType<typeof buildGamesCourse>>>;

/** The page's tiers (`gamesCourseRecord`), no veto. */
const after = (sans: string[], side: 'white' | 'black'): Promise<Course | null> =>
  buildGamesCourse(sans, side, { lookup: storedTreeAt, variations: variationTreeAnswer, engine: engineLineAt });
/** The builder before the tiers: the stored trees only. */
const before = (sans: string[], side: 'white' | 'black'): Promise<Course | null> =>
  buildGamesCourse(sans, side, { lookup: storedTreeAt, variations: async (s) => { const r = await storedTreeAt(s); return r ? { result: r, source: 'masters' as const } : null; }, engine: null });

const legal = (sans: readonly string[]): boolean => { const c = new Chess(); try { for (const s of sans) c.move(s); return true; } catch { return false; } };

describe('real All-section pages, built past the data floor', () => {
  it('the Paris Gambit (no games in any tree): it no longer hands off — the engine carries the main line, and no variation is made up', async () => {
    const named = ['Nh3', 'd5', 'g3', 'e5', 'f4'];
    const old = (await before(named, 'white'))!;
    expect(old.main.sans).toEqual(named); // nothing past the name …
    expect(old.variations).toEqual([]); // … and no variation: the page handed off
    const c = (await after(named, 'white'))!;
    expect(c.incomplete).toBe(false);
    expect(c.main.engineFrom).toBe(5);
    expect(c.main.sans.length).toBeGreaterThan(named.length + 10);
    expect(legal(c.main.sans)).toBe(true);
    // The club games do not reach this board either: no variation (G3).
    expect(c.variations).toEqual([]);
  });

  it('the Polish Grigorian (b4 Nc6, under 10 master games): club games give its variations, the engine its main line', async () => {
    const named = ['b4', 'Nc6'];
    const old = (await before(named, 'black'))!;
    expect(old.main.sans.length <= named.length && old.variations.length === 0).toBe(true); // handed off
    const c = (await after(named, 'black'))!;
    expect(c.incomplete).toBe(false);
    expect(c.main.engineFrom).toBe(2);
    expect(legal(c.main.sans)).toBe(true);
    const club = c.variations.filter((v) => v.source === 'club');
    expect(club.length).toBeGreaterThan(0);
    for (const v of c.variations) {
      expect(legal(v.sans)).toBe(true);
      expect(v.engineFrom).toBeNull(); // a variation is games' moves only
      expect(v.sans.slice(0, v.from)).toEqual(c.main.sans.slice(0, v.from)); // it splits off the main line
    }
    // Their first move is one club players play at the split: b5 (620 of 994).
    expect(club.some((v) => v.from === 2 && v.sans[2] !== c.main.sans[2])).toBe(true);
  });

  it("Anderssen's Opening: the games' moves stay as they were, the engine starts where they ran out", async () => {
    const named = ['a3'];
    const old = (await before(named, 'white'))!;
    const c = (await after(named, 'white'))!;
    expect(old.main.stop).toBe('thin');
    expect(c.main.sans.slice(0, old.main.sans.length)).toEqual(old.main.sans);
    expect(c.main.engineFrom).toBe(old.main.sans.length);
    expect(c.main.sans.length).toBeGreaterThan(old.main.sans.length);
    expect(legal(c.main.sans)).toBe(true);
    if (c.main.stop === 'middlegame') expect(isMiddlegameBoard(c.main.sans)).toBe(true);
  });
});

describe('the shipped engine lines', () => {
  const dir = join(PUBLIC, 'data/engine-lines');
  const lines = readdirSync(dir).flatMap((f) => Object.entries(JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, string>));
  it('16 files, every board a line (not vacuous)', () => {
    expect(readdirSync(dir).filter((f) => f.endsWith('.json'))).toHaveLength(16);
    expect(lines.length).toBeGreaterThan(1500);
  });
  it('every move legal from its board, and no line runs on past a middlegame board', () => {
    let middlegame = 0;
    for (const [key, ucis] of lines) {
      const fen = `${key} 0 1`;
      const all = ucis.split(' ');
      const san = uciLineToSan(fen, all);
      expect(san.length, key).toBe(all.length);
      // Played from the board: the kings settle on the line's LAST move at
      // the earliest — never earlier, or the line ran past its middlegame.
      const c = new Chess(fen);
      for (let i = 0; i < san.length; i += 1) {
        c.move(san[i]);
        const settled = c.fen().split(' ')[2] === '-';
        const last = c.history({ verbose: true }).at(-1)!;
        const halfExchange = Boolean(last.captured) && c.moves({ verbose: true }).some((m) => m.to === last.to && m.captured);
        if (i < san.length - 1) expect(settled && !halfExchange, `${key}: middlegame at ${i} of ${san.length}`).toBe(false);
        else if (settled && !halfExchange) middlegame += 1;
      }
    }
    // Measured 2026-11-08: most lines reach a middlegame board; the rest stop
    // at the cap with a king still uncastled under best play.
    expect(middlegame / lines.length).toBeGreaterThan(0.4);
  }, 120_000);
  it('the builder stops exactly where the line does: the middlegame test is the walk\'s own', () => {
    expect(middlegamePly(['e4', 'e5', 'Ke2', 'Ke7'])).toBe(4);
  });
});

describe('the shipped club index', () => {
  const dir = join(PUBLIC, 'data/club-tree');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = files.flatMap((f) => Object.entries(JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, [number, number, number, ...Array<[string, number, number, number]>]>));
  it('every shard is shipped, and holds boards (not vacuous)', () => {
    expect(files).toHaveLength(256);
    expect(rows.length).toBeGreaterThan(1000);
  });
  it('every board is legal, read from 20+ club games, its moves legal and the most played first', () => {
    for (const [key, row] of rows) {
      const sans = key.split(' ');
      const r = clubRowToResult(sans, row);
      expect(r, key).not.toBeNull();
      expect(r!.white + r!.draws + r!.black, key).toBeGreaterThanOrEqual(20);
      expect(r!.moves.length, key).toBe(row.length - 3);
      const n = r!.moves.map((m) => m.white + m.draws + m.black);
      expect(n, key).toEqual([...n].sort((a, b) => b - a));
    }
  });
});
