// Resolve duplicate-anchor plans: when two plans share the same grounded line,
// reassign the later one(s) to a DISTINCT candidate game whose move-17 endpoint is
// sound for the student. Bakes picks into the tracked grounded file.
const fs = require('fs');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const grPath = 'scripts/pro-repertoire/grounded/plan-lines.json';
const gr = JSON.parse(fs.readFileSync(grPath, 'utf8'));
const candPath = 'audit-reports/grounded-plan-candidates.json';
if (!fs.existsSync(candPath)) { console.log('no candidates file — skip (grounded already deduped)'); process.exit(0); }
const cand = require('../../' + candPath);
const mp = require('../../src/data/middlegame-plans.json');
const plans = Array.isArray(mp) ? mp : mp.plans;
const repo = require('../../src/data/pro-repertoires.json');
const colorOf = (id) => { const p = plans.find((x) => x.id === id); const o = repo.openings.find((o) => o.id === (p && p.openingId)); return (o && o.color) === 'black' ? 'b' : 'w'; };
function evalFen(fen) {
  return new Promise((res) => { const sf = spawn('/usr/games/stockfish'); let o = ''; sf.stdout.on('data', (d) => { o += d.toString(); }); sf.stdin.write('uci\n'); setTimeout(() => sf.stdin.write(`position fen ${fen}\ngo depth 16\n`), 120); setTimeout(() => { const ls = o.split('\n').filter((l) => l.includes('score cp') || l.includes('score mate')); const m = (ls[ls.length - 1] || '').match(/score (cp|mate) (-?\d+)/); const stm = fen.split(' ')[1]; let cp = m ? (m[1] === 'cp' ? parseInt(m[2], 10) : (m[2] > 0 ? 1000 : -1000)) : 0; sf.kill(); res(stm === 'w' ? cp : -cp); }, 1400); });
}
const endEval = async (line) => { const c = new Chess(line.fen); for (const m of line.moves) c.move(m); const w = await evalFen(c.fen()); return w; };

(async () => {
  // group grounded plan ids by their current line signature (fen|moves)
  const sig = (l) => `${l.fen}|${l.moves.join(',')}`;
  const seen = new Map(); // sig -> first planId
  const dups = [];
  for (const id of Object.keys(gr)) { const s = sig(gr[id]); if (seen.has(s)) dups.push(id); else seen.set(s, id); }
  console.log(`duplicate-anchor plans to reassign: ${dups.length}`);
  let fixed = 0; const unresolved = [];
  for (const id of dups) {
    const used = new Set(Object.keys(gr).map((k) => sig(gr[k])));
    const cs = cand[id] || [];
    let best = null; let bestCp = -1e9;
    for (const c of cs) {
      if (!c.fen || !c.moves) continue;
      if (used.has(sig(c))) continue; // must be distinct
      const stu = colorOf(id) === 'b' ? -1 : 1;
      const cp = (await endEval(c)) * stu;
      if (cp > bestCp) { bestCp = cp; best = c; }
      if (cp >= 80) break;
    }
    if (best && bestCp >= -60) { gr[id] = { ...best }; fixed++; }
    else { unresolved.push(`${id} (best ${bestCp})`); if (best) gr[id] = { ...best }; }
  }
  fs.writeFileSync(grPath, JSON.stringify(gr, null, 2));
  console.log(`reassigned ${fixed} dup plans to distinct sound lines`);
  if (unresolved.length) { console.log('no distinct sound candidate (kept best available):'); unresolved.forEach((u) => console.log('  ', u)); }
})();
