// WO-ALL-SECTION-DEPTH, MEASURE FIRST (David 2026-11-07: "They are WAY
// truncated opening lessons"). Every All-section opening built the way its page
// builds it (`buildGamesCourse` on the stored trees — the master tree, then the
// strong-online tree), against the curated courses: how far the main line runs
// past its name, why it stopped, whether it reaches a middlegame, and how many
// variation tabs it gets. No engine veto (the page's veto only shortens a line
// that leaves the student lost).
//
//   ALL_DEPTH=1 npx vitest run src/services/allSectionDepth.measure.test.ts
//
// Writes audit-reports/all-section-depth.json (checkpointed every 200 openings,
// so a kill loses minutes, never the run).
import { describe, it, vi } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ON = process.env.ALL_DEPTH === '1';
const PUBLIC = join(process.cwd(), 'public');
/** WHAT IF the walk read club games past the stored trees (ALL_DEPTH_CLUB=1):
 *  the four club-tree months on disk merged (Lichess, 1200–1999, move order to
 *  move 9), a board taken from them when the stored trees hold fewer than the
 *  walk's floor and the club games hold at least CLUB_ENOUGH. A measure for
 *  David's call, not a build: the page reads only the stored trees. */
const CLUB = process.env.ALL_DEPTH_CLUB === '1';
const CLUB_ENOUGH = 20;
const OUT = CLUB ? 'audit-reports/all-section-depth-club.json' : 'audit-reports/all-section-depth.json';

vi.mock('./dataFile', () => ({
  loadDataJson: (path: string): Promise<unknown> => {
    const file = join(PUBLIC, path);
    return Promise.resolve(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown : null);
  },
}));

interface Row {
  name: string; eco: string; side: 'white' | 'black'; named: number;
  main: number; past: number; stop: string; middlegame: boolean; games: number;
  variations: number; variationsToMiddlegame: number; longestVariation: number;
}

const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (n: number, d: number): string => `${d ? Math.round((100 * n) / d) : 0}%`;

describe.skipIf(!ON)('All-section depth against the curated courses', () => {
  it('measures every opening', async () => {
    const { storedTreeAt } = await import('./deepTree');
    type Res = NonNullable<Awaited<ReturnType<typeof storedTreeAt>>>;
    const club = new Map<string, Map<string, [number, number, number]>>();
    if (CLUB) {
      const dir = 'data/sources/club-tree';
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        const nodes = (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { nodes: Record<string, { m: Record<string, number[]> }> }).nodes;
        for (const [k, node] of Object.entries(nodes)) {
          const at = club.get(k) ?? new Map<string, [number, number, number]>();
          for (const [san, a] of Object.entries(node.m)) {
            const n = a[3] + a[6]; const w = a[4] + a[7]; const d = a[5] + a[8];
            const was = at.get(san) ?? [0, 0, 0];
            at.set(san, [was[0] + n, was[1] + w, was[2] + d]);
          }
          club.set(k, at);
        }
      }
      console.log(`[all-depth] club boards: ${club.size}`);
    }
    const total = (r: Res | null): number => (r ? r.white + r.draws + r.black : 0);
    const clubAt = (sans: readonly string[]): Res | null => {
      const at = club.get(sans.join(' '));
      if (!at) return null;
      const moves = [...at].map(([san, [n, w, d]]) => ({ uci: '', san, averageRating: 1600, white: w, draws: d, black: n - w - d, game: null, opening: null }));
      const white = moves.reduce((x, m) => x + m.white, 0); const draws = moves.reduce((x, m) => x + m.draws, 0); const black = moves.reduce((x, m) => x + m.black, 0);
      return { white, draws, black, moves } as unknown as Res;
    };
    const lookup = async (sans: readonly string[]): Promise<Res | null> => {
      const r = await storedTreeAt(sans);
      if (!CLUB || total(r) >= 10) return r;
      const c = clubAt(sans);
      return c && total(c) >= CLUB_ENOUGH ? c : r;
    };
    const { buildGamesCourse } = await import('./gamesCourse');
    const { inferStudentSideFromName } = await import('./openingDetectionService');
    const all = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8')) as Array<{ eco: string; name: string; pgn: string }>;
    const curated = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as Array<{ name: string; pgn: string; variations?: Array<{ pgn: string }> }>;
    const curatedNames = new Set(curated.map((c) => c.name));
    const rows: Row[] = [];
    const save = (done: boolean): void => {
      mkdirSync('audit-reports', { recursive: true });
      writeFileSync(OUT, JSON.stringify({ done, measured: rows.length, of: all.length, rows }, null, 1));
    };
    for (const o of all) {
      if (curatedNames.has(o.name)) continue;
      const sans = o.pgn.trim().split(/\s+/).filter(Boolean);
      const side = inferStudentSideFromName(o.name);
      let course: Awaited<ReturnType<typeof buildGamesCourse>> = null;
      try { course = await buildGamesCourse(sans, side, { lookup }); } catch { course = null; }
      if (!course) { rows.push({ name: o.name, eco: o.eco, side, named: sans.length, main: sans.length, past: 0, stop: 'none', middlegame: false, games: 0, variations: 0, variationsToMiddlegame: 0, longestVariation: 0 }); continue; }
      rows.push({
        name: o.name, eco: o.eco, side, named: sans.length,
        main: course.main.sans.length, past: course.main.sans.length - sans.length, stop: course.main.stop,
        middlegame: course.main.stop === 'middlegame', games: course.main.games,
        variations: course.variations.length,
        variationsToMiddlegame: course.variations.filter((v) => v.stop === 'middlegame').length,
        longestVariation: Math.max(0, ...course.variations.map((v) => v.sans.length)),
      });
      if (rows.length % 200 === 0) { save(false); console.log(`[all-depth] ${rows.length}`); }
    }
    save(true);
    // The curated courses' own depth, for the comparison.
    const cMain = curated.map((c) => c.pgn.trim().split(/\s+/).filter(Boolean).length);
    const cVars = curated.map((c) => c.variations?.length ?? 0);
    const stops = new Map<string, number>();
    for (const r of rows) stops.set(r.stop, (stops.get(r.stop) ?? 0) + 1);
    const lines = [
      `All section: ${rows.length} openings (curated skipped: ${curatedNames.size})`,
      `  main line plies, median ${median(rows.map((r) => r.main))}; past its name, median ${median(rows.map((r) => r.past))}`,
      `  reaches a middlegame: ${rows.filter((r) => r.middlegame).length} (${pct(rows.filter((r) => r.middlegame).length, rows.length)})`,
      `  stop: ${[...stops].map(([k, v]) => `${k} ${v}`).join(', ')}`,
      `  variations, median ${median(rows.map((r) => r.variations))}; none: ${rows.filter((r) => r.variations === 0).length}`,
      `  nothing past the name and no variation (the page hands off): ${rows.filter((r) => r.past <= 0 && r.variations === 0).length}`,
      `Curated: ${curated.length} courses; main line plies, median ${median(cMain)}; variations, median ${median(cVars)}`,
    ];
    console.log(lines.join('\n'));
  }, 7_200_000);
});
