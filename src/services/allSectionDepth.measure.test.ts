// WO-ALL-SECTION-DEPTH (David 2026-11-07: "They are WAY truncated opening
// lessons" → 2026-11-08: "Stockfish's best moves fill the main line past the
// data floor; club games give the variations"). Every All-section opening built
// the way its page builds it, BEFORE and AFTER, against the curated courses:
//   before — the stored trees only (the master tree, then the strong-online
//            tree), no engine tier;
//   after  — the page's own options (`gamesCourseRecord`): the main line's
//            games, then Stockfish's best moves past them (`engineLineAt`);
//            the variations on the stored trees, then club games
//            (`variationTreeAnswer`).
// How far the main line runs past its name, whether it reaches a middlegame,
// how many plies the engine played, how many variation tabs (and from which
// games), and how many pages still hand off to Learn with Coach. No veto (the
// page's veto only swaps a main line that leaves the student lost).
//
//   ALL_DEPTH=1 npx vitest run src/services/allSectionDepth.measure.test.ts
//
// Writes audit-reports/all-section-depth.json (checkpointed every 200 openings,
// so a kill loses minutes, never the run).
//
// Two build modes feed the data files the page reads:
//   ALL_DEPTH_TERMINI=<file>      the boards the main lines' games run out on
//                                 (input of build-engine-lines.mjs)
//   ALL_DEPTH_CLUB_INDEX=<dir>    the club boards the pages' variations read,
//                                 written as the shipped club index
//                                 (`clubTree.ts`), from the raw club tree at
//                                 ALL_DEPTH_CLUB_SRC (default
//                                 data/sources/club-tree); run AFTER the engine
//                                 lines are in public/data/engine-lines, since
//                                 the variations are read along the main line
//                                 the engine carries on.
import { describe, it, vi } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ON = process.env.ALL_DEPTH === '1';
const TERMINI = process.env.ALL_DEPTH_TERMINI ?? '';
const CLUB_INDEX = process.env.ALL_DEPTH_CLUB_INDEX ?? '';
const CLUB_SRC = process.env.ALL_DEPTH_CLUB_SRC ?? 'data/sources/club-tree';
const PUBLIC = join(process.cwd(), 'public');
const OUT = 'audit-reports/all-section-depth.json';

vi.mock('./dataFile', () => ({
  loadDataJson: (path: string): Promise<unknown> => {
    const file = join(PUBLIC, path);
    return Promise.resolve(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown : null);
  },
}));

interface Opening { eco: string; name: string; pgn: string }
function allSection(): Opening[] {
  const all = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8')) as Opening[];
  const curated = new Set((JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as Array<{ name: string }>).map((c) => c.name));
  return all.filter((o) => !curated.has(o.name));
}
const sansOf = (pgn: string): string[] => pgn.trim().split(/\s+/).filter(Boolean);

/** THE BOARDS THE MAIN LINES' GAMES RUN OUT ON (ALL_DEPTH_TERMINI=<file>): for
 *  every All-section page, the board its main line stops THIN on, walked on
 *  the stored trees exactly as the page walks it (`walkToMiddlegame` from the
 *  named line; the named line itself when its own board is thin). The input of
 *  `scripts/all-openings/build-engine-lines.mjs`, which plays Stockfish's best
 *  moves on from each to the middlegame. */
describe.skipIf(!TERMINI)('All-section main lines: where the games run out', () => {
  it('writes every thin terminus', async () => {
    const { storedTreeAt } = await import('./deepTree');
    const { walkToMiddlegame } = await import('./gamesCourse');
    const { inferStudentSideFromName } = await import('./openingDetectionService');
    const { Chess } = await import('chess.js');
    const out = new Map<string, { key: string; sans: string[]; pages: number }>();
    let n = 0;
    for (const o of allSection()) {
      const sans = sansOf(o.pgn);
      const student = inferStudentSideFromName(o.name) === 'white' ? 'w' : 'b';
      let end: string[] | null = null;
      try {
        const root = await storedTreeAt(sans);
        if (!root || root.white + root.draws + root.black < 10) end = sans;
        else { const w = await walkToMiddlegame(sans, student, { lookup: storedTreeAt }); if (w.stop === 'thin') end = w.sans; }
      } catch { end = null; }
      if (end) {
        const c = new Chess(); for (const s of end) c.move(s);
        const key = c.fen().split(' ').slice(0, 4).join(' ');
        const was = out.get(key);
        if (was) was.pages += 1; else out.set(key, { key, sans: end, pages: 1 });
      }
      n += 1;
      if (n % 500 === 0) console.log(`[termini] ${n}`);
    }
    writeFileSync(TERMINI, JSON.stringify([...out.values()]));
    console.log(`[termini] pages ${n}, distinct thin boards ${out.size}`);
  }, 7_200_000);
});

/** THE CLUB INDEX (ALL_DEPTH_CLUB_INDEX=<dir>): every page built with its own
 *  options, the variations reading the RAW club tree (the four months merged,
 *  bands 1200–1999) where the stored trees hold too few games; each club board
 *  a page read is written to the shipped index — its totals and the moves a
 *  walk reads (the four most played and every move at 8%+), so the index
 *  answers exactly as the raw tree did. Every one of the 256 shards is
 *  written, `{}` when empty: a shard that cannot be had is a failed read. */
describe.skipIf(!CLUB_INDEX)('All-section variations: the club boards the pages read', () => {
  it('writes the club index', async () => {
    const { storedTreeAnswer, CLUB_ENOUGH } = await import('./deepTree');
    const { buildGamesCourse } = await import('./gamesCourse');
    const { engineLineAt } = await import('./engineLine');
    const { clubShardFor } = await import('./clubTree');
    const { storedTreeAt } = await import('./deepTree');
    const { inferStudentSideFromName } = await import('./openingDetectionService');
    type Res = NonNullable<Awaited<ReturnType<typeof storedTreeAt>>>;
    const club = new Map<string, Map<string, [number, number, number]>>();
    for (const f of readdirSync(CLUB_SRC).filter((x) => x.endsWith('.json'))) {
      const nodes = (JSON.parse(readFileSync(join(CLUB_SRC, f), 'utf8')) as { nodes: Record<string, { m: Record<string, number[]> }> }).nodes;
      for (const [k, node] of Object.entries(nodes)) {
        const at = club.get(k) ?? new Map<string, [number, number, number]>();
        for (const [san, a] of Object.entries(node.m)) {
          const was = at.get(san) ?? [0, 0, 0];
          at.set(san, [was[0] + a[4] + a[7], was[1] + a[5] + a[8], was[2] + (a[3] - a[4] - a[5]) + (a[6] - a[7] - a[8])]);
        }
        club.set(k, at);
      }
      console.log(`[club-index] read ${f}: ${club.size} boards`);
    }
    const used = new Set<string>();
    const rowOf = (k: string): Res | null => {
      const at = club.get(k);
      if (!at) return null;
      const moves = [...at].map(([san, [w, d, b]]) => ({ uci: '', san, averageRating: 1600, white: w, draws: d, black: b, game: null }));
      return { white: moves.reduce((x, m) => x + m.white, 0), draws: moves.reduce((x, m) => x + m.draws, 0), black: moves.reduce((x, m) => x + m.black, 0), moves, topGames: [], opening: null } as unknown as Res;
    };
    const variations = async (sans: readonly string[]): Promise<{ result: Res; source: 'masters' | 'online' | 'club' } | null> => {
      const stored = await storedTreeAnswer(sans);
      if (stored) return stored;
      const k = sans.join(' ');
      const r = rowOf(k);
      if (!r || r.white + r.draws + r.black < CLUB_ENOUGH) return null;
      used.add(k);
      return { result: r, source: 'club' };
    };
    let n = 0;
    for (const o of allSection()) {
      try { await buildGamesCourse(sansOf(o.pgn), inferStudentSideFromName(o.name), { lookup: storedTreeAt, variations, engine: engineLineAt }); } catch { /* an illegal named line */ }
      n += 1;
      if (n % 500 === 0) console.log(`[club-index] ${n} pages, ${used.size} club boards`);
    }
    // One row per board: totals, then the four most played and every move at 8%+.
    const shards = new Map<string, Record<string, unknown[]>>();
    for (let i = 0; i < 256; i += 1) shards.set(i.toString(16).padStart(2, '0'), {});
    for (const k of used) {
      const at = club.get(k)!;
      const all = [...at].sort((a, b) => (b[1][0] + b[1][1] + b[1][2]) - (a[1][0] + a[1][1] + a[1][2]));
      const total = all.reduce((x, [, [w, d, b]]) => x + w + d + b, 0);
      const W = all.reduce((x, [, [w]]) => x + w, 0); const D = all.reduce((x, [, [, d]]) => x + d, 0);
      const kept = all.filter(([, [w, d, b]], i) => i < 4 || (w + d + b) / total >= 0.08).map(([san, [w, d, b]]) => [san, w, d, b]);
      shards.get(clubShardFor(k.split(' ')))![k] = [W, D, total - W - D, ...kept];
    }
    mkdirSync(CLUB_INDEX, { recursive: true });
    let bytes = 0;
    for (const [name, rows] of shards) { const text = JSON.stringify(rows); bytes += text.length; writeFileSync(join(CLUB_INDEX, `${name}.json`), text); }
    console.log(`[club-index] pages ${n}, club boards ${used.size}, ${(bytes / 1024).toFixed(0)} KB in 256 shards`);
  }, 7_200_000);
});

interface Side {
  main: number; past: number; stop: string; middlegame: boolean;
  engine: number; variations: number; clubVariations: number; longestVariation: number;
  /** Variations split off the main line at a move the engine chose. */
  engineSplits: number;
}
interface Row { name: string; eco: string; side: 'white' | 'black'; named: number; before: Side; after: Side }

const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (n: number, d: number): string => `${d ? Math.round((100 * n) / d) : 0}%`;

describe.skipIf(!ON)('All-section depth against the curated courses', () => {
  it('measures every opening, before and after', async () => {
    const { storedTreeAt, variationTreeAnswer } = await import('./deepTree');
    const { engineLineAt } = await import('./engineLine');
    const { buildGamesCourse } = await import('./gamesCourse');
    const { inferStudentSideFromName } = await import('./openingDetectionService');
    type Course = NonNullable<Awaited<ReturnType<typeof buildGamesCourse>>>;
    const asMasters = async (sans: readonly string[]): Promise<{ result: NonNullable<Awaited<ReturnType<typeof storedTreeAt>>>; source: 'masters' } | null> => {
      const r = await storedTreeAt(sans);
      return r ? { result: r, source: 'masters' } : null;
    };
    const sideOf = (named: number, c: Course | null): Side => {
      if (!c) return { main: named, past: 0, stop: 'none', middlegame: false, engine: 0, variations: 0, clubVariations: 0, longestVariation: 0, engineSplits: 0 };
      return {
        main: c.main.sans.length, past: c.main.sans.length - named, stop: c.main.stop, middlegame: c.main.stop === 'middlegame',
        engine: c.main.engineFrom === null ? 0 : c.main.sans.length - c.main.engineFrom,
        variations: c.variations.length, clubVariations: c.variations.filter((v) => v.source === 'club').length,
        longestVariation: Math.max(0, ...c.variations.map((v) => v.sans.length)),
        engineSplits: c.main.engineFrom === null ? 0 : c.variations.filter((v) => v.from >= (c.main.engineFrom ?? Infinity)).length,
      };
    };
    const rows: Row[] = [];
    const save = (done: boolean): void => {
      mkdirSync('audit-reports', { recursive: true });
      writeFileSync(OUT, JSON.stringify({ done, measured: rows.length, rows }, null, 1));
    };
    for (const o of allSection()) {
      const sans = sansOf(o.pgn);
      const side = inferStudentSideFromName(o.name);
      const build = async (after: boolean): Promise<Course | null> => {
        try {
          return await buildGamesCourse(sans, side, after
            ? { lookup: storedTreeAt, variations: variationTreeAnswer, engine: engineLineAt }
            : { lookup: storedTreeAt, variations: asMasters, engine: null });
        } catch { return null; }
      };
      // The page's own hand-off rule (`gamesCourseRecord`): nothing past the
      // name and no variation.
      const before = sideOf(sans.length, await build(false));
      const after = sideOf(sans.length, await build(true));
      rows.push({ name: o.name, eco: o.eco, side, named: sans.length, before, after });
      if (rows.length % 200 === 0) { save(false); console.log(`[all-depth] ${rows.length}`); }
    }
    save(true);
    const curated = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as Array<{ pgn: string; variations?: Array<{ pgn: string }> }>;
    const report = (label: string, pick: (r: Row) => Side): string[] => {
      const s = rows.map(pick);
      const stops = new Map<string, number>();
      for (const x of s) stops.set(x.stop, (stops.get(x.stop) ?? 0) + 1);
      const engined = s.filter((x) => x.engine > 0);
      return [
        `${label}:`,
        `  main line plies, median ${median(s.map((x) => x.main))}; past its name, median ${median(s.map((x) => x.past))}`,
        `  reaches a middlegame: ${s.filter((x) => x.middlegame).length} (${pct(s.filter((x) => x.middlegame).length, s.length)})`,
        `  stop: ${[...stops].map(([k, v]) => `${k} ${v}`).join(', ')}`,
        `  engine plies on ${engined.length} pages, median ${median(engined.map((x) => x.engine))}; variations split at an engine move: ${s.reduce((n, x) => n + x.engineSplits, 0)}`,
        `  variations, median ${median(s.map((x) => x.variations))}; none: ${s.filter((x) => x.variations === 0).length}; from club games: ${s.reduce((n, x) => n + x.clubVariations, 0)} on ${s.filter((x) => x.clubVariations > 0).length} pages`,
        `  hands off (nothing past the name, no variation): ${s.filter((x) => x.past <= 0 && x.variations === 0).length}`,
      ];
    };
    console.log([
      `All section: ${rows.length} openings`,
      ...report('BEFORE (stored trees only)', (r) => r.before),
      ...report('AFTER (engine past the main line\'s games, club games for variations)', (r) => r.after),
      `Curated: ${curated.length} courses; main line plies, median ${median(curated.map((c) => sansOf(c.pgn).length))}; variations, median ${median(curated.map((c) => c.variations?.length ?? 0))}`,
    ].join('\n'));
  }, 7_200_000);
});
