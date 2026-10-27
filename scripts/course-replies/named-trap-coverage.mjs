// TRAP CENSUS, source 1 of 3 — the canonical NAMED traps against the course
// (WO-COURSE-01). The list (`named-traps.json`) is every trap the Lichess DB
// names plus Wikipedia's List of chess traps, each move chess.js-checked; `slip`
// is the ply index of the losing move.
//
// For each trap and each course opening it touches, by POSITION (any move
// order): is the board before the slip on one of the opening's lines?
//   - you are the side that PUNISHES → it should be a weapon (gem / named trap);
//   - you are the side that SLIPS    → it should be a warning.
// Reports what is taught, what is on our lines but untaught, and what the
// course never reaches. Usage: node scripts/course-replies/named-trap-coverage.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const tokens = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));
const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');

const openings = ['repertoire', 'pro-repertoires', 'gambits', 'anti-openings'].flatMap((f) => arr(J(`src/data/${f}.json`))).filter((o) => o?.id && o.pgn);
const subs = J('src/data/course-sublines.json');
// board → openings whose lines reach it (with the side to move there)
const reach = new Map();
for (const o of openings) {
  const lines = [['main', tokens(o.pgn)], ...(o.variations ?? []).map((v, i) => [`var-${i}`, tokens(v.pgn)]),
    ...Object.entries(subs[o.id] ?? {}).flatMap(([t, l]) => l.map((s) => [`sub-${t}::${s.triggerMove}@${s.atPly}`, s.moves]))];
  for (const [line, sans] of lines) {
    const c = new Chess();
    for (let i = 0; i <= sans.length; i++) {
      const k = pos(c.fen());
      const list = reach.get(k) ?? [];
      if (!list.some((x) => x.id === o.id)) list.push({ id: o.id, color: o.color, line, ply: i });
      reach.set(k, list);
      if (i === sans.length) break;
      try { c.move(sans[i]); } catch { break; }
    }
  }
}
const gemAt = new Set();
for (const g of [...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]) {
  const c = new Chess();
  try { for (const s of tokens(g.lineMoves)) c.move(s); } catch { continue; }
  gemAt.add(`${g.openingId}|${pos(c.fen())}|${g.inaccuracy}`);
}
// Hand-authored trap lessons and repertoire trap/warning lines, by the moves they play.
const lessonText = readdirSync(root + 'src/data/lessons').filter((f) => /Trap/.test(f) && f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => readFileSync(root + 'src/data/lessons/' + f, 'utf8')).join('\n');
const curatedLines = openings.flatMap((o) => [...(o.trapLines ?? []), ...(o.warningLines ?? [])].map((t) => ({ id: o.id, name: t.name, sans: tokens(t.pgn).join(' ') })));

const rows = [];
for (const t of J('scripts/course-replies/named-traps.json')) {
  const sans = t.moves.split(' ');
  const c = new Chess();
  for (const s of sans.slice(0, t.slip)) c.move(s);
  const board = pos(c.fen());
  const slipper = t.slip % 2 === 0 ? 'white' : 'black';
  const lineThrough = sans.slice(0, t.slip + 2).join(' ');
  const here = reach.get(board) ?? [];
  const per = here.map((x) => {
    const role = x.color === slipper ? 'warning' : 'weapon';
    const taught = gemAt.has(`${x.id}|${board}|${sans[t.slip]}`)
      || curatedLines.some((l) => l.id === x.id && l.sans.startsWith(lineThrough))
      || (lessonText.includes(t.name.split(' (')[0]) && x.id.match(/ruy|vienna|caro|italian|scotch/) !== null);
    return { id: x.id, role, taught, line: `${x.line}@${x.ply}` };
  });
  rows.push({ name: t.name, slip: sans[t.slip], src: t.src, onLines: per });
}
writeFileSync(root + 'audit-reports/named-trap-coverage.json', JSON.stringify(rows, null, 1));
for (const r of rows) {
  const s = r.onLines.length === 0 ? 'NOT ON ANY COURSE LINE'
    : r.onLines.map((x) => `${x.id} ${x.role}${x.taught ? ' ✓' : ' ✗'}`).join(' · ');
  console.log(`${r.name} (${r.slip}): ${s}`);
}
