// Gate C fix pass: for each deep-hit (plan anchor found on a real corpus-game
// path), check the path extends one of the entry's lines as a prefix, then
// engine-eval the new terminus from the student's side. Emits accepted
// patches (apply with --apply).
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import fs from 'fs';

const APPLY = process.argv.includes('--apply');
const hits = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec-deep-hits.json', 'utf8'));
const plans = new Map(JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8')).map((p) => [p.id, p]));
const repPath = 'src/data/repertoire.json';
const proPath = 'src/data/pro-repertoires.json';
const antiPath = 'src/data/anti-openings.json';
const repertoire = JSON.parse(fs.readFileSync(repPath, 'utf8'));
const pro = JSON.parse(fs.readFileSync(proPath, 'utf8'));
const anti = JSON.parse(fs.readFileSync(antiPath, 'utf8'));
const entryOf = (id) => repertoire.find((x) => x.id === id) ?? pro.openings.find((x) => x.id === id) ?? anti.find((x) => x.id === id);

function ev(fen, ms = 8000) {
  return new Promise((res) => {
    const sf = spawn('/usr/games/stockfish');
    let cp = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const all = s.match(/score (cp|mate) (-?\d+)/g);
      if (all) { const l = all[all.length - 1].match(/(cp|mate) (-?\d+)/); cp = l[1] === 'mate' ? (Number(l[2]) > 0 ? 9999 : -9999) : Number(l[2]); }
      if (/bestmove/.test(s)) { sf.kill(); res(cp); }
    });
    sf.stdin.write(`position fen ${fen}\ngo movetime ${ms}\n`);
    setTimeout(() => { try { sf.kill(); } catch {} res(cp); }, 12000);
  });
}

const accepted = []; const rejected = [];
for (const [pid, h] of Object.entries(hits)) {
  const plan = plans.get(pid);
  const entry = entryOf(plan.openingId);
  if (!entry) { rejected.push({ pid, why: 'no entry' }); continue; }
  const student = entry.color === 'black' ? 'b' : 'w';
  const pathSans = h.path.split(' ');
  const lines = [{ name: '<main>', pgn: entry.pgn }, ...(entry.variations ?? []).map((v) => ({ name: v.name, pgn: v.pgn }))];
  let best = null;
  for (const ln of lines) {
    if (!ln.pgn) continue;
    const sans = ln.pgn.trim().split(/\s+/);
    if (sans.length < pathSans.length && sans.every((m, i) => m === pathSans[i])) {
      if (!best || sans.length > best.len) best = { name: ln.name, len: sans.length };
    }
  }
  if (!best) { rejected.push({ pid, why: 'no prefix line', path: h.path }); continue; }
  // legality + terminus eval
  const c = new Chess();
  let ok = true;
  for (const m of pathSans) { try { if (!c.move(m)) { ok = false; break; } } catch { ok = false; break; } }
  if (!ok) { rejected.push({ pid, why: 'illegal path' }); continue; }
  const cp = await ev(c.fen());
  if (cp == null) { rejected.push({ pid, why: 'no eval' }); continue; }
  const stud = c.turn() === student ? cp : -cp;
  if (stud < -100) { rejected.push({ pid, why: `unsound terminus ${stud}cp`, line: best.name }); continue; }
  accepted.push({ pid, openingId: plan.openingId, line: best.name, from: best.len, to: pathSans.length, stud, newPgn: h.path });
  console.log(`ACCEPT ${plan.openingId} :: ${pid} | ${best.name} ${best.len}p→${pathSans.length}p | student ${stud}cp`);
}
console.log(`\naccepted=${accepted.length} rejected=${rejected.length}`);
for (const r of rejected) console.log(`  REJECT ${r.pid}: ${r.why}${r.line ? ` (${r.line})` : ''}`);
fs.writeFileSync('audit-reports/masterclass-sweep/gatec-extend.json', JSON.stringify({ accepted, rejected }, null, 1));

if (APPLY) {
  let n = 0;
  for (const a of accepted) {
    const entry = entryOf(a.openingId);
    if (a.line === '<main>') entry.pgn = a.newPgn;
    else { const v = entry.variations.find((x) => x.name === a.line); v.pgn = a.newPgn; }
    n++;
  }
  fs.writeFileSync(repPath, JSON.stringify(repertoire, null, 1) + '\n');
  fs.writeFileSync(proPath, JSON.stringify(pro, null, 1) + '\n');
  fs.writeFileSync(antiPath, JSON.stringify(anti, null, 1) + '\n');
  console.log(`APPLIED ${n} pgn extensions`);
}
