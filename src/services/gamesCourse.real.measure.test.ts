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

  it('builds every reply of a taught line (opponent moves only) and prints them', async () => {
    const { masterTreeAt } = await import('./masterTree');
    const { buildReplies } = await import('./gamesCourse');
    const LINES: Array<[string, string, number, 'white' | 'black']> = [
      ["Bishop's Opening", 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 dxe4 Ng5 O-O', 3, 'white'],
      ['Caro-Kann Defense', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6', 2, 'black'],
      ['Italian Game', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', 5, 'white'],
    ];
    for (const [name, pgn, from, side] of LINES) {
      const sans = pgn.split(' ');
      const { replies, incomplete } = await buildReplies(sans, from, side, { lookup: masterTreeAt });
      console.log(`\n${name} [${side}] from ply ${from} — ${replies.length} replies${incomplete ? ' INCOMPLETE' : ''}`);
      for (const r of replies) {
        const c = new Chess();
        for (const s of r.moves) expect(() => c.move(s)).not.toThrow();
        expect(r.moves.slice(0, r.atPly)).toEqual(sans.slice(0, r.atPly));
        expect(r.moves[r.atPly]).toBe(r.triggerMove);
        expect(r.triggerMove).not.toBe(sans[r.atPly]);
        console.log(`  @${r.atPly} ${r.triggerMove} ${Math.round(r.pct)}% of ${r.games} → ${r.moves.length} plies${r.reachesMiddlegame ? ' (middlegame)' : ''}${r.name ? ` ${r.name}` : ''}`);
      }
    }
  }, 600_000);

  it('teaches built replies on the fly and prints the beats', async () => {
    const { masterTreeAt } = await import('./masterTree');
    const { buildReplies } = await import('./gamesCourse');
    const { generatedLessonFor, lessonBeatsOnLine } = await import('./generatedLesson');
    const line = 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 dxe4 Ng5 O-O'.split(' ');
    const { replies } = await buildReplies(line, 3, 'white', { lookup: masterTreeAt });
    for (const r of replies.slice(0, 3)) {
      const t0 = Date.now();
      const script = await generatedLessonFor({ name: r.name || "Bishop's Opening", eco: 'C24', moves: r.moves, openingId: 'bishops-opening', color: 'white', corpusNotes: true });
      const beats = script ? lessonBeatsOnLine(script, r.moves) : [];
      console.log(`\n@${r.atPly} ${r.triggerMove} — ${beats.length} spoken beats of ${r.moves.length} moves (${Date.now() - t0} ms)`);
      for (const b of beats) console.log(`  ${b.atMove + 1}. ${r.moves[b.atMove]}: ${b.say}${b.arrows?.length ? ` [${b.arrows.length} arrows]` : ''}`);
      expect(beats.length).toBeGreaterThan(0);
    }
  }, 600_000);

  it('reads the middlegame plan masters played from each line\'s end', async () => {
    const { masterTreeAt } = await import('./masterTree');
    const { computedPlanAt } = await import('./computedPlan');
    const LINES: Array<[string, string, 'white' | 'black']> = [
      ["Bishop's Opening", 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 dxe4 Ng5 O-O', 'white'],
      ['Caro-Kann Advance', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6', 'black'],
      ['Italian Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', 'white'],
      ["King's Indian", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', 'black'],
      ['Sicilian Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6', 'black'],
    ];
    for (const [name, pgn, side] of LINES) {
      const t0 = Date.now();
      const plan = await computedPlanAt(pgn.split(' '), side, 'x', 'computed-x', { lookup: masterTreeAt });
      console.log(`\n${name} [${side}] (${Date.now() - t0} ms)`);
      if (!plan) { console.log('  (no plan)'); continue; }
      console.log(`  title: ${plan.title}\n  overview: ${plan.overview}`);
      console.log(`  breaks: ${plan.pawnBreaks.map((b) => b.move).join(', ')}  routes: ${plan.pieceManeuvers.map((m) => `${m.piece} ${m.route}`).join(', ')}`);
      console.log(`  line: ${plan.playableLines?.[0]?.moves.join(' ') ?? '(none)'}`);
      const base = plan.playableLines?.[0];
      if (base) {
        const { generatedLessonFor, lessonBeatsOnLine, overlayBeats } = await import('./generatedLesson');
        const moves = [...pgn.split(' '), ...base.moves];
        const script = await generatedLessonFor({ name, eco: '', moves, openingId: 'x', color: side, corpusNotes: true });
        const line = script ? overlayBeats(base, lessonBeatsOnLine(script, moves), pgn.split(' ').length) : base;
        line.moves.forEach((m, i) => { if (line.annotations[i]) console.log(`    ${m}: ${line.annotations[i]}`); });
      }
      const c = new Chess(plan.criticalPositionFen);
      for (const s of plan.playableLines?.[0]?.moves ?? []) expect(() => c.move(s)).not.toThrow();
    }
  }, 600_000);
});
