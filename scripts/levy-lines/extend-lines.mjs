// EVERY LESSON LINE TO A MIDDLEGAME (WO-OPENINGS-REWRITE-01 R4). A pro opening
// rewritten as a Watch course joins the masterclass gates, and their depth floor
// is 20 plies (G9.3 Gate B: a line reaches a middlegame) — 55 of the 89
// GothamChess lines stopped short of it. Each line the fact sheet walked
// (`<id>.lines.json`) that is shorter is carried on by THE ONE course walker
// (`course-replies/line-walk.mjs`), every move it already has kept, so the
// writer's line for that tab runs past its repertoire PGN on the same path; the
// PGN, the plans anchored on it and the sublines keyed on it do not move.
//
//   node scripts/levy-lines/extend-lines.mjs <factsDir> <openingId>…
//     → <factsDir>/<openingId>.full-lines.json  ({ [openingId]: [{ name, moves }] }, LESSON_LINES)
import { readFileSync, writeFileSync } from 'node:fs';
import { Engine } from '../course-replies/engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from '../course-replies/line-walk.mjs';

const MIN_PLIES = 20;
// The walker reads at the fact sheet's depth (lessonFacts grades at 16): at its
// default depth 12 it carried the GothamChess Fantasy main line on with Nc3,
// +2.1 at depth 12 and level at 14, where Nxf7 wins material — a 2-pawn miss
// taught as the line's last move. A move the walker picks must hold at the
// depth the sheet grades it, and the sheet must not grade the walk shallower
// (a depth-14 sheet called sound depth-16 moves costly).
const WALK_DEPTH = 16;
const [dir, ...ids] = process.argv.slice(2);
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const pro = J('src/data/pro-repertoires.json');
const rep = J('src/data/repertoire.json');
const colorOf = (id) => [...rep, ...(Array.isArray(pro) ? pro : pro.openings)].find((o) => o.id === id)?.color;

const engine = new Engine();
for (const id of ids) {
  const color = colorOf(id);
  const lines = J(`${dir}/${id}.lines.json`);
  const out = [];
  let extended = 0;
  for (const l of lines) {
    let moves = l.moves;
    if (moves.length < MIN_PLIES) {
      moves = await walkToMiddlegame(l.moves, { studentColor: color, engine, masters, knownMistakes, openingId: id, minLength: MIN_PLIES, maxPlies: MIN_PLIES + 10, depth: WALK_DEPTH });
      if (moves.length > l.moves.length) extended += 1;
    }
    out.push({ name: l.tab, moves });
  }
  writeFileSync(`${dir}/${id}.full-lines.json`, JSON.stringify({ [id]: out }));
  const short = out.filter((l) => l.moves.length < MIN_PLIES).map((l) => `${l.name} (${l.moves.length})`);
  console.log(`[extend-lines] ${id}: ${extended} of ${lines.length} lines carried on${short.length ? `; still short: ${short.join(', ')}` : ''}`);
}
engine.quit();
