// THE BUILDER ON THE REAL TREE (WO-ALL-OPENINGS-01 P2/P3). Reads the shipped
// master-tree files off disk through the real reader and builds the course an
// All-section page would show for a spread of untaught openings: the main line
// and where it stopped, every variation tab, and every move replayed legal.
//
//   GAMES_COURSE_REAL=1 npx vitest run src/services/gamesCourse.real.measure.test.ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const ON = process.env.GAMES_COURSE_REAL === '1';
const PUBLIC = join(process.cwd(), 'public');

vi.mock('./dataFile', () => ({
  loadDataJson: (path: string): Promise<unknown> => {
    const file = join(PUBLIC, path);
    return Promise.resolve(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown : null);
  },
}));

const OPENINGS: Array<[string, string, 'white' | 'black']> = [
  ['Sicilian Defense: Mengarini Variation', 'e4 c5 a3', 'black'],
  ['Sicilian Defense: Bowdler Attack', 'e4 c5 Bc4', 'black'],
  ['Sicilian Defense: Snyder Variation', 'e4 c5 b3', 'black'],
  ['Nimzo-Larsen Attack', 'b3', 'white'],
  ['Owen Defense', 'e4 b6', 'black'],
  ['Bird Opening', 'f4', 'white'],
  ['English Opening: Anglo-Indian Defense', 'c4 Nf6', 'black'],
  ['Barnes Opening: Hammerschlag', 'f3 e5 Kf2', 'white'],
  ['Barnes Opening: Fool\'s Mate', 'f3 e5 g4 Qh4#', 'white'],
  ['Amar Opening: Paris Gambit', 'Nh3 d5 g3 e5 f4', 'white'],
];

describe.skipIf(!ON)('the games course on the real master tree', () => {
  it('builds every opening to legal lines and prints them', async () => {
    const { masterTreeAt } = await import('./masterTree');
    const { buildGamesCourse } = await import('./gamesCourse');
    // A MISS: the parent board says 10+ masters played the move, and the
    // child board is not where the walk looked (a filing hole, not thin data).
    let asked = 0; let misses = 0; const missAt: string[] = [];
    const lookup = async (sans: readonly string[]): Promise<Awaited<ReturnType<typeof masterTreeAt>>> => {
      asked += 1;
      const r = await masterTreeAt(sans);
      if (!r && sans.length > 0) {
        const parent = await masterTreeAt(sans.slice(0, -1));
        const row = parent?.moves.find((m) => m.san === sans[sans.length - 1]);
        if (row && row.white + row.draws + row.black >= 10) { misses += 1; missAt.push(sans.join(' ')); }
      }
      return r;
    };
    for (const [name, pgn, side] of OPENINGS) {
      const sans = pgn.split(' ');
      const course = await buildGamesCourse(sans, side, { lookup });
      if (!course) { console.log(`${name}: (illegal)`); continue; }
      const all = [course.main, ...course.variations];
      for (const l of all) {
        const c = new Chess();
        for (const s of l.sans) expect(() => c.move(s)).not.toThrow();
      }
      console.log(`\n${name} [${side}] — ${course.main.games} games at the name, main ${course.main.sans.length} plies (${course.main.stop})${course.incomplete ? ' INCOMPLETE' : ''}`);
      console.log(`  main: ${course.main.sans.join(' ')}`);
      for (const v of course.variations) {
        console.log(`  var @${v.from} ${v.sans[v.from]} ${Math.round((v.share ?? 0) * 100)}% of ${v.games} → ${v.sans.length} plies (${v.stop})${v.name ? ` ${v.name}` : ''}`);
      }
    }
    console.log(`\nlookups ${asked}, filing misses ${misses}${missAt.length ? `:\n  ${missAt.slice(0, 20).join('\n  ')}` : ''}`);
  }, 600_000);
});
