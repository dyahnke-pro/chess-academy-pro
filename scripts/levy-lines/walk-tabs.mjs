// LEVY'S TAB LINES, WALKED TO A MIDDLEGAME (WO-OPENINGS-REWRITE-01 R4). A line he
// teaches in a video stops where he stops talking; a tab must reach a
// middlegame (G9.3 Gate B). Every one of his moves is kept, then the line goes
// on through THE ONE course walker (`course-replies/line-walk.mjs`): the
// masters' most-played move where they reached the board in ≥ 8 games (for the
// student, within half a pawn of the engine's best), else the engine's best, a
// known mistake punished, stopping at the middlegame on the student's move.
//
//   nice node scripts/levy-lines/walk-tabs.mjs   → docs/levy-lines/_tabs-walked.json (resumes: walks only what is new)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Engine } from '../course-replies/engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from '../course-replies/line-walk.mjs';

const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const OUT = 'docs/levy-lines/_tabs-walked.json';
const placement = J('docs/levy-lines/_placement.json');
const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const done = existsSync(OUT) ? J(OUT) : [];
const seen = new Set(done.map((d) => d.moves));

// Tabs and new openings, and the replies too: a reply on a tab is walked to a
// middlegame like every other course subline. Traps end where the punishment
// lands and are not walked.
const todo = placement.filter((r) => r.taught && ['tab', 'new-opening', 'reply'].includes(r.place) && !seen.has(r.moves));
console.log(`[walk-tabs] ${todo.length} to walk (${done.length} already)`);
const engine = new Engine();
let k = 0;
for (const r of todo) {
  const sans = r.moves.split(' ');
  const walked = await walkToMiddlegame(sans, { studentColor: r.side, engine, masters, knownMistakes, openingId: r.opening ?? 'levy', minLength: Math.max(sans.length + 1, 14), maxPlies: Math.max(sans.length, 14) + 20 });
  done.push({ ...r, levyPlies: sans.length, walked: walked.join(' '), added: walked.length - sans.length });
  k += 1;
  if (k % 10 === 0) { writeFileSync(OUT, JSON.stringify(done, null, 1)); console.log(`[walk-tabs] ${k}/${todo.length}`); }
}
engine.quit();
writeFileSync(OUT, JSON.stringify(done, null, 1));
console.log(`[walk-tabs] done ${done.length}; median added plies ${done.map((d) => d.added).sort((a, b) => a - b)[Math.floor(done.length / 2)]}`);
