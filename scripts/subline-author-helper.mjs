// Author-aid for clearing dead-end sublines in Group B (sublineNarrationE4Other).
// For OPENING=<id>, prints each UNIQUE const that maps a dead-end key (deepest
// beat atMove <= atPly while the line runs >=4 plies past the deviation), with:
//   - the const name + every key it serves
//   - the full data line
//   - per-ply: index, SAN, side, and (for the STUDENT's moves past the
//     deviation) the piece that moved + its destination — the candidate beat
//     anchors + arrow origins.
// I author 3-4 beats per const from this, board-verified, then wire them in.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const src = readFileSync(ROOT + 'src/data/lessons/sublineNarrationE4Other.ts', 'utf8');
const OPENING = process.env.OPENING;
if (!OPENING) { console.error('set OPENING=<id>'); process.exit(1); }

// key -> const (only `'key': NXXX,` mappings)
const keyToConst = {};
for (const m of src.matchAll(/^\s+'([^']+)':\s*(N\d+),/gm)) keyToConst[m[1]] = m[2];
// const -> does it already have beats? + its atMove list
function constHasPastBeat(konst, ply) {
  const re = new RegExp(`const ${konst}: SublineNarration = \\{[\\s\\S]*?\\n\\};`, 'm');
  const block = src.match(re)?.[0] ?? '';
  const atMoves = [...block.matchAll(/atMove:\s*(\d+)/g)].map((x) => +x[1]);
  return atMoves.length ? Math.max(...atMoves) > ply : false;
}

const find = (o, v, tr, p) => (data[o]?.[v] ?? []).find((s) => s.triggerMove === tr && s.atPly === p) ?? null;

// gather dead-end consts for this opening
const byConst = {};
for (const v of Object.keys(data[OPENING] || {})) {
  for (const s of data[OPENING][v]) {
    const key = `${OPENING}::${v}::${s.triggerMove}@${s.atPly}`;
    const konst = keyToConst[key];
    if (!konst) continue;
    const past = s.moves.length - 1 - s.atPly;
    if (past < 4) continue;
    if (constHasPastBeat(konst, s.atPly)) continue;
    (byConst[konst] = byConst[konst] || { keys: [], s, ply: s.atPly }).keys.push(key);
  }
}

const studentWhite = (ply) => ply % 2 === 1;
for (const [konst, info] of Object.entries(byConst)) {
  const s = info.s; const ply = info.ply; const sw = studentWhite(ply);
  console.log(`\n━━━ ${konst}  (student=${sw ? 'White' : 'Black'}, deviation ${s.triggerMove}@${ply})`);
  console.log(`keys: ${info.keys.join(', ')}`);
  const c = new Chess(); const rows = [];
  s.moves.forEach((mv, i) => {
    const res = c.move(mv);
    const isStudent = (res.color === 'w') === sw;
    const pastDev = i > ply;
    const mark = pastDev && isStudent ? ` ⟵ STUDENT move@${i}: ${res.piece.toUpperCase()}${res.from}→${res.to}` : '';
    rows.push(`  ${i}: ${mv}${mark}`);
  });
  console.log(rows.join('\n'));
  console.log(`  line: ${s.moves.join(' ')}`);
}
