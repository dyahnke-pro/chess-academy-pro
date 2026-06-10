import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
const SF = '/usr/games/stockfish';
function ev(fen, d = 18, ms = 6000) { return new Promise((r) => { const sf = spawn(SF); let cp = null; sf.stdout.on('data', (x) => { for (const l of x.toString().split('\n')) { const m = l.match(/score (cp|mate) (-?\d+)/); if (m) cp = m[1] === 'mate' ? (+m[2] > 0 ? 100000 : -100000) : +m[2]; } if (/bestmove/.test(x.toString())) { sf.kill(); r(cp); } }); sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`); setTimeout(() => { try { sf.kill() } catch {}; r(cp) }, ms); }); }
const color = {};
for (const f of ['src/data/repertoire.json', 'src/data/gambits.json', 'src/data/pro-repertoires.json']) { const d = JSON.parse(readFileSync(f, 'utf8')); for (const o of (d.openings ?? d)) color[o.id] = (o.color || 'white')[0]; }
const scaffold = JSON.parse(readFileSync('/tmp/punish-scaffold.json', 'utf8'));
const PRO = process.argv.includes('pro');
const cm = JSON.parse(readFileSync('src/data/common-mistakes.json', 'utf8'));
const confirmed = [];
for (const [oid, arr] of Object.entries(scaffold)) {
  if (oid.startsWith('pro-') !== PRO) continue;
  for (const e of arr) {
    const cps = e.facts.map((f) => f.cp).filter((c) => typeof c === 'number'); if (Math.max(0, ...cps.map(Math.abs)) < 120) continue;
    const stu = color[oid]; const c = new Chess(e.fen); if (c.turn() !== stu) continue; // oriented only
    const entry = (cm[oid] || []).find((x) => x.wrongMove === e.wrongMove); const correct = entry?.correctMove; if (!correct) continue;
    const cw = new Chess(e.fen); try{cw.move(e.wrongMove)}catch{continue}; const ew = await ev(cw.fen(), 18); const wStu = cw.turn() === stu ? ew : -ew;
    const cc = new Chess(e.fen); try{cc.move(correct)}catch{continue}; const ec = await ev(cc.fen(), 18); const cStu = cc.turn() === stu ? ec : -ec;
    const real = wStu <= -150 && cStu >= -90 && (cStu - wStu) >= 150;
    console.log(`${real ? '✓REAL' : 'x dim'} ${oid}::${e.wrongMove}  wrong ${wStu}cp  correct ${correct} ${cStu}cp`);
    if (real) confirmed.push(`${oid}::${e.wrongMove}`);
  }
}
console.log('\nCONFIRMED real disasters:', confirmed.length);
console.log(confirmed.join('\n'));
