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
      moves = await walkToMiddlegame(l.moves, { studentColor: color, engine, masters, knownMistakes, openingId: id, minLength: MIN_PLIES, maxPlies: MIN_PLIES + 10 });
      if (moves.length > l.moves.length) extended += 1;
    }
    out.push({ name: l.tab, moves });
  }
  writeFileSync(`${dir}/${id}.full-lines.json`, JSON.stringify({ [id]: out }));
  const short = out.filter((l) => l.moves.length < MIN_PLIES).map((l) => `${l.name} (${l.moves.length})`);
  console.log(`[extend-lines] ${id}: ${extended} of ${lines.length} lines carried on${short.length ? `; still short: ${short.join(', ')}` : ''}`);
}
engine.quit();
