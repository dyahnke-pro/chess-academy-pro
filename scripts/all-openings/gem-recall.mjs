// THE GEM CALCULATOR'S RECALL GATE (WO-ALL-OPENINGS-01 O2). The famous
// beginner traps — each a line, the slip, and who slips — checked against what
// the calculator found. For every miss it says why: the club tree never
// reached the board, too few club games played the slip, or the calculator saw
// it and rejected it (a calculator bug to fix, or a "trap" that is not one).
//
//   node scripts/all-openings/gem-recall.mjs --month 2016-01
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const MONTH = arg('month', '2016-01');

/** [name, line before the slip, the slip]. Every move chess.js-checked below. */
export const FAMOUS = [
  ["Scholar's mate (…Nc6)", 'e4 e5 Bc4 Nc6 Qh5', 'Nf6'],
  ["Scholar's mate (…Bc5)", 'e4 e5 Bc4 Bc5 Qh5', 'Nf6'],
  ['Qh5 after …Bc5: …Nc6', 'e4 e5 Bc4 Bc5 Qh5', 'Nc6'],
  ["Scholar's mate (Qf3)", 'e4 e5 Bc4 Nc6 Qf3', 'd6'],
  ["Fool's mate", 'f3 e5', 'g4'],
  ['Légal mate', 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5', 'Bxd1'],
  ['Blackburne Shilling', 'e4 e5 Nf3 Nc6 Bc4 Nd4', 'Nxe5'],
  ['Fishing Pole', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Ng4 h3 h5', 'hxg4'],
  ['Elephant trap', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5', 'Nxd5'],
  ['Englund trap', 'd4 e5 dxe5 Qe7 Bf4 Qb4+ Bd2 Qxb2', 'Bc3'],
  ['Damiano defence', 'e4 e5 Nf3 f6 Nxe5', 'fxe5'],
  ['Petrov copycat', 'e4 e5 Nf3 Nf6 Nxe5', 'Nxe4'],
  ['Caro-Kann smothered mate', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2', 'Ngf6'],
  ['Stafford: Bg5', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5', 'Bg5'],
  ['Mortimer trap', 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Ne7', 'Nxe5'],
  ['Lasker trap', 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3', 'Bxb4'],
  ['Kieninger trap', 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5', 'axb4'],
  ['Englund (…Nc6 first)', 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2', 'Bc3'],
];

const key = (sans) => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen().split(' ').slice(0, 4).join(' '); };

for (const [name, line, slip] of FAMOUS) {
  const c = new Chess();
  for (const s of line.split(' ')) c.move(s);
  c.move(slip); // throws on a list error — never a silent wrong entry
}

const tree = existsSync(`${root}data/sources/club-tree/${MONTH}.json`) ? JSON.parse(readFileSync(`${root}data/sources/club-tree/${MONTH}.json`, 'utf8')) : null;
const ranked = JSON.parse(readFileSync(`${root}data/sources/club-gems/${MONTH}/ranked.json`, 'utf8'));
const found = new Map(ranked.map((g) => [`${g.board}|${g.slip}`, g]));

let hit = 0; let reachable = 0;
for (const [name, line, slip] of FAMOUS) {
  const sans = line.split(' ');
  const g = found.get(`${key(sans)}|${slip}`);
  const node = tree?.nodes[line];
  const total = node ? Object.values(node.m).reduce((a, arr) => a + arr[0] + arr[3], 0) : 0;
  const played = node?.m[slip] ? node.m[slip][0] + node.m[slip][3] : 0;
  const inReach = played >= 20 && total > 0 && played / total >= 0.01;
  if (inReach) reachable += 1;
  if (g) { hit += 1; console.log(`FOUND   ${name}: ${slip}?? → ${g.punish.join(' ')} (${g.mate ? 'mate' : `+${g.won}`}, ${g.games}g, juice ${g.juice})`); continue; }
  const why = !node ? 'the club tree never reached the board (move order or depth)'
    : !inReach ? `club players under 1600 played it ${played} times of ${total} — under the 20-game / 1% bar`
      : 'IN REACH AND NOT FOUND — the engine rejected it (read it: a calculator bug, or not a trap)';
  console.log(`MISSED  ${name}: ${why}`);
}
console.log(`\nrecall ${hit}/${FAMOUS.length} famous traps; ${reachable} were in the club tree's reach`);
