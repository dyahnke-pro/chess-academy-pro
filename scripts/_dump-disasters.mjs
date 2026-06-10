import { Chess } from 'chess.js';
import { readFileSync } from 'fs';
const scaffold = JSON.parse(readFileSync('/tmp/punish-scaffold.json', 'utf8'));
// opening colors
const color = {};
for (const f of ['src/data/repertoire.json', 'src/data/gambits.json', 'src/data/pro-repertoires.json']) {
  const d = JSON.parse(readFileSync(f, 'utf8')); const arr = d.openings ?? d;
  for (const o of arr) color[o.id] = (o.color || 'white')[0];
}
const PRO = process.argv.includes('pro');
const rows = [];
for (const [oid, arr] of Object.entries(scaffold)) {
  if ((oid.startsWith('pro-')) !== PRO) continue;
  for (const e of arr) {
    const cps = e.facts.map((f) => f.cp).filter((c) => typeof c === 'number');
    const mx = Math.max(0, ...cps.map(Math.abs));
    if (mx < 120) continue; // not a disaster
    const stu = color[oid]; const c = new Chess(e.fen);
    const fenSide = c.turn();
    // student-perspective eval at the deepest scored ply
    let lastCp = null, lastSide = null;
    const cc = new Chess(e.fen);
    for (const f of e.facts) { cc.move(f.san); if (typeof f.cp === 'number') { lastCp = f.cp; lastSide = cc.turn(); } }
    const stuEval = lastSide === stu ? lastCp : -lastCp; // student perspective
    rows.push({ oid, wrong: e.wrongMove, stu, fenSide, oriented: fenSide === stu, stuEval, n: e.moves.length, line: e.moves.join(' ') });
  }
}
rows.sort((a, b) => a.oid.localeCompare(b.oid));
console.log(`${rows.length} disaster candidates (${PRO ? 'pro' : 'masterclass'}):`);
for (const r of rows) {
  console.log(`${r.oriented ? '✓' : '✗MISORIENT'} ${r.oid}::${r.wrong} stu=${r.stu} stuEval=${r.stuEval}cp (${r.n}p) | ${r.line}`);
}
