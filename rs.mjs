import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
const SF = '/usr/games/stockfish';
const DEPTH = 24;
function ev(fen, d = DEPTH, ms = 12000) {
  return new Promise((r) => { const sf = spawn(SF); let cp = null;
    sf.stdout.on('data', (x) => { for (const l of x.toString().split('\n')) { const m = l.match(/score (cp|mate) (-?\d+)/); if (m) cp = m[1] === 'mate' ? (+m[2] > 0 ? 100000 : -100000) : +m[2]; } if (/bestmove/.test(x.toString())) { sf.kill(); r(cp); } });
    sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`); setTimeout(() => { try { sf.kill(); } catch {} r(cp); }, ms); });
}
const color = {};
for (const f of ['src/data/repertoire.json', 'src/data/gambits.json', 'src/data/pro-repertoires.json']) { const d = JSON.parse(readFileSync(f, 'utf8')); for (const o of (d.openings ?? d)) color[o.id] = (o.color || 'white')[0]; }
const cm = JSON.parse(readFileSync('src/data/common-mistakes.json', 'utf8'));
const newly = [];
let scanned = 0;
for (const [oid, arr] of Object.entries(cm)) {
  const stu = color[oid]; if (!stu) continue;
  for (const p of arr) {
    if (p.punishmentLine) continue; // only the ones WITHOUT a walkthrough (dim/positional)
    if (!p.fen || !p.wrongMove || !p.correctMove) continue;
    const c0 = new Chess(p.fen); if (c0.turn() !== stu) continue; // oriented student-to-move only
    let cw, cc;
    try { cw = new Chess(p.fen); cw.move(p.wrongMove); } catch { continue; }
    try { cc = new Chess(p.fen); cc.move(p.correctMove); } catch { continue; }
    scanned++;
    const ew = await ev(cw.fen()); const wStu = cw.turn() === stu ? ew : -ew;
    const ec = await ev(cc.fen()); const cStu = cc.turn() === stu ? ec : -ec;
    const real = wStu != null && cStu != null && wStu <= -150 && cStu >= -90 && (cStu - wStu) >= 150;
    const near = wStu != null && cStu != null && wStu <= -110 && (cStu - wStu) >= 110;
    if (real) { newly.push(`✓REAL ${oid}::${p.wrongMove} wrong=${wStu} correct(${p.correctMove})=${cStu}`); }
    else if (near) { newly.push(`~near ${oid}::${p.wrongMove} wrong=${wStu} correct(${p.correctMove})=${cStu}`); }
  }
}
console.log(`resweep @ depth ${DEPTH}: scanned ${scanned} pitfalls without a walkthrough`);
console.log(newly.length ? newly.join('\n') : 'no dim pitfall newly qualifies as a real disaster at depth 24');
