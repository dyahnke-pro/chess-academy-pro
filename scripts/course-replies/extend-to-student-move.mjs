// A taught line ends on the STUDENT's move (WO-COURSE-01 C). 1,723 of 5,194
// sublines stopped on the opponent's move (2026-10-27): the student watched
// the reply and was never shown the answer, and the last board never became a
// review card (cards are the student's moves). Each is extended through the ONE
// course walker: the answer is the masters' move from ≥ 8 games within 50cp of
// the engine, else the engine's best; when the opponent's last move is a known
// mistake its punishment is played out. Moves already in the line never change,
// so the narration written on them stays true.
//
// Usage: node scripts/course-replies/extend-to-student-move.mjs --shard i/n
//        node scripts/course-replies/extend-to-student-move.mjs --merge [--write]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Engine } from './engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from './line-walk.mjs';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const subs = J('src/data/course-sublines.json');
const colorOf = new Map(['repertoire', 'pro-repertoires', 'gambits', 'anti-openings']
  .flatMap((f) => arr(J(`src/data/${f}.json`))).filter((o) => o?.id).map((o) => [o.id, o.color]));
const keyOf = (id, tab, s) => `${id}::${tab}::${s.triggerMove}@${s.atPly}`;
const OUT = (i) => `${root}audit-reports/subline-extend.shard-${i}.json`;

if (process.argv.includes('--merge')) {
  const ext = new Map(readdirSync(root + 'audit-reports').filter((f) => /^subline-extend\.shard-\d+\.json$/.test(f))
    .flatMap((f) => Object.entries(JSON.parse(readFileSync(root + 'audit-reports/' + f, 'utf8')))));
  let n = 0;
  for (const [id, tabs] of Object.entries(subs)) for (const [tab, list] of Object.entries(tabs)) for (const s of list) {
    const add = ext.get(keyOf(id, tab, s));
    if (add?.length) { s.moves = [...s.moves, ...add]; n++; }
  }
  console.log(`[extend] ${n} lines extended${process.argv.includes('--write') ? '' : ' (dry run)'}`);
  if (process.argv.includes('--write')) writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(subs));
  process.exit(0);
}

const [I, N] = process.argv[process.argv.indexOf('--shard') + 1].split('/').map(Number);
const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const todo = [];
for (const [id, tabs] of Object.entries(subs)) for (const [tab, list] of Object.entries(tabs)) for (const s of list) {
  const lastBy = (s.moves.length - 1) % 2 === 0 ? 'white' : 'black';
  if (lastBy !== colorOf.get(id)) todo.push([id, tab, s]);
}
const engine = new Engine();
const out = {};
let n = 0;
for (const [id, tab, s] of todo.filter((_, k) => k % N === I)) {
  const moves = await walkToMiddlegame(s.moves, {
    studentColor: colorOf.get(id), engine, masters, knownMistakes, openingId: id,
    minLength: s.moves.length + 1, maxPlies: s.moves.length + 7,
  });
  out[keyOf(id, tab, s)] = moves.slice(s.moves.length);
  if (++n % 50 === 0) { writeFileSync(OUT(I), JSON.stringify(out)); console.log(`[extend ${I}/${N}] ${n}`); }
}
engine.quit();
writeFileSync(OUT(I), JSON.stringify(out));
console.log(`[extend ${I}/${N}] done ${n}`);
