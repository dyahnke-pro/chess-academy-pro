#!/usr/bin/env node
// Full-catalog soundness sweep: every registered lesson (main + variation,
// masterclass + gambit + pro + anti) AND every data pgn (repertoire /
// pro-repertoires / anti-openings mains + variations). Student-perspective
// eval at each line's terminus; FEN-deduped. Output: JSON rows sorted worst-first.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { build } from 'esbuild';
import { tmpdir } from 'os';
import { join } from 'path';
import fs from 'fs';

const SF = '/usr/games/stockfish';
function ev(fen) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g);
      if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0]);
      const mt = s.match(/score mate (-?\d+)/);
      if (mt) cp = parseInt(mt[1]) > 0 ? 10000 : -10000;
      if (/bestmove/.test(s)) { sf.kill(); res(cp); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth 18\n`);
    setTimeout(() => { try { sf.kill(); } catch {} res(cp); }, 15000);
  });
}

const o = join(tmpdir(), `lb-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(o);

const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));

// jobs: { key, sans[], student('w'|'b') }
const jobs = [];
for (const { key, lesson } of getAllLessonScripts()) {
  let bt = lesson.beats[0];
  for (const x of lesson.beats) if (x.moves.length > bt.moves.length) bt = x;
  jobs.push({ key: `lesson:${key}`, sans: bt.moves, student: lesson.orientation === 'black' ? 'b' : 'w' });
}
function addData(list, tag) {
  for (const e of list) {
    const student = e.color === 'black' ? 'b' : 'w';
    if (e.pgn) jobs.push({ key: `${tag}:${e.id}::<main>`, sans: e.pgn.trim().split(/\s+/), student });
    for (const v of e.variations ?? []) {
      if (v?.pgn) jobs.push({ key: `${tag}:${e.id}::${v.name}`, sans: v.pgn.trim().split(/\s+/), student });
    }
  }
}
addData(repertoire, 'rep');
addData(pro, 'pro');
addData(anti, 'anti');

// resolve FENs, dedupe
const byFen = new Map(); // fen -> {keys[], student, plies, mated}
let illegal = [];
for (const j of jobs) {
  const c = new Chess();
  let ok = true;
  for (const m of j.sans) { try { if (!c.move(m)) { ok = false; break; } } catch { ok = false; break; } }
  if (!ok) { illegal.push(j.key); continue; }
  const fen = c.fen();
  const mated = c.isCheckmate();
  const cur = byFen.get(fen);
  if (cur) { cur.keys.push(j.key); }
  else byFen.set(fen, { keys: [j.key], student: j.student, plies: j.sans.length, fen, mated });
}
console.log(`jobs=${jobs.length} unique-fens=${byFen.size} illegal=${illegal.length}`);
if (illegal.length) console.log('ILLEGAL LINES:', illegal.join(' | '));

const rows = [];
let done = 0;
for (const rec of byFen.values()) {
  let persp;
  if (rec.mated) {
    // side to move is mated; student wins if it's the opponent mated
    const c = new Chess(rec.fen);
    persp = c.turn() === rec.student ? -10000 : 10000;
  } else {
    const cp = await ev(rec.fen);
    if (cp == null) { persp = null; }
    else {
      const c = new Chess(rec.fen);
      persp = c.turn() === rec.student ? cp : -cp;
    }
  }
  rows.push({ keys: rec.keys, student: rec.student, plies: rec.plies, cp: persp });
  done++;
  if (done % 50 === 0) console.log(`...${done}/${byFen.size}`);
}
rows.sort((a, b) => (a.cp ?? 0) - (b.cp ?? 0));
fs.mkdirSync('audit-reports/masterclass-sweep', { recursive: true });
fs.writeFileSync('audit-reports/masterclass-sweep/soundness.json', JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => r.cp != null && r.cp < -100 && r.cp > -9000);
console.log(`\n=== ${bad.length} line-termini leave the student worse than -1.0 ===`);
for (const r of bad.slice(0, 60)) console.log(`  ${r.student} ${String(r.cp).padStart(6)}cp (${r.plies}p) ${r.keys[0]}${r.keys.length > 1 ? ` (+${r.keys.length - 1} dup)` : ''}`);
console.log('SWEEP COMPLETE');
