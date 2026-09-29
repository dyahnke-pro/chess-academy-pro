// Build the four engine reads moveIntent needs, at his "what is it for" moments
// and at a control sample where he says nothing of the kind.
//   node scripts/scoreboard/intent-probe.mjs  → data/sources/acc-naro/intent-reads.json
// `before` / `after` are reused from the depth-14 annotation; the two null-move
// reads (the side to move passes) are searched here, at the same depth.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const DEPTH = 14;
const games = JSON.parse(readFileSync('data/sources/acc-naro/multipv-d14.json', 'utf8'));
const his = JSON.parse(readFileSync('scripts/scoreboard/his-tags.json', 'utf8'));
const WANT = new Set(['M-PURPOSE-QUIET', 'M-PURPOSE-PREVENT', 'M-TWO-JOBS']);

function engine() {
  const p = spawn('node', ['node_modules/stockfish/scripts/cli.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = ''; let tap = null;
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); tap?.(l); } });
  const send = (c) => p.stdin.write(`${c}\n`);
  const until = (pred) => new Promise((res) => { tap = (l) => { if (pred(l)) { tap = null; res(l); } }; });
  return { send, until, setTap: (f) => { tap = f; }, kill: () => p.kill() };
}
async function ready(e) { e.send('uci'); await e.until((l) => l.startsWith('uciok')); e.send('setoption name MultiPV value 3'); e.send('isready'); await e.until((l) => l.startsWith('readyok')); }
async function read(e, fen) {
  const lines = new Map(); const black = fen.split(' ')[1] === 'b';
  const done = new Promise((res) => e.setTap((l) => {
    if (l.startsWith('bestmove')) { e.setTap(null); res(); return; }
    if (!l.startsWith('info') || !l.includes(` depth ${DEPTH} `) || !l.includes(' pv ')) return;
    const k = /multipv (\d+)/.exec(l); if (!k) return;
    const cp = /score cp (-?\d+)/.exec(l); const mate = /score mate (-?\d+)/.exec(l); const flip = black ? -1 : 1;
    lines.set(Number(k[1]), { cp: cp ? Number(cp[1]) * flip : null, mate: mate ? Number(mate[1]) * flip : null, pv: l.slice(l.indexOf(' pv ') + 4).trim().split(/\s+/) });
  }));
  e.send(`position fen ${fen}`); e.send(`go depth ${DEPTH}`); await done;
  return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}
function pass(fen) {
  const c = new Chess(fen); if (c.inCheck()) return null;
  const p = fen.split(' '); p[1] = p[1] === 'w' ? 'b' : 'w'; p[3] = '-'; return p.join(' ');
}

const moments = [];
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
for (const g of games) {
  const id = g.id.replace(/^naro-/, '');
  const us = g.white === g.us ? 'w' : 'b';
  for (let i = 0; i + 1 < g.plies.length; i++) {
    const b = g.plies[i]; if (!b.san || b.fen.split(' ')[1] !== us) continue;
    const ply = i + 1; const tag = his[`${id}:${ply}`];
    const codes = tag ? tag.codes : [];
    const hit = codes.some((c) => WANT.has(c));
    if (hit || rnd() < 0.08) moments.push({ game: id, ply, fenBefore: b.fen, san: b.san, fenAfter: g.plies[i + 1].fen, before: b.lines, after: g.plies[i + 1].lines, his: tag?.text ?? null, codes, target: hit });
  }
}
console.log(`moments ${moments.length} (target ${moments.filter((m) => m.target).length})`);
const JOBS = 4; const q = [...moments]; let n = 0;
await Promise.all(Array.from({ length: JOBS }, async () => {
  const e = engine(); await ready(e);
  while (q.length) {
    const m = q.shift();
    const pb = pass(m.fenBefore); const pa = pass(m.fenAfter);
    m.passBefore = pb ? await read(e, pb) : [];
    m.passAfter = pa ? await read(e, pa) : [];
    if (++n % 20 === 0) console.log(`read ${n}/${moments.length}`);
  }
  e.kill();
}));
writeFileSync('data/sources/acc-naro/intent-reads.json', JSON.stringify(moments));
console.log('wrote data/sources/acc-naro/intent-reads.json');
