#!/usr/bin/env node
// THE ENGINE, GRADED LIKE A HUMAN (WO-STRENGTH-01, 2026-10-22). Per-move
// mistake rate of the APP'S engine (Stockfish 18 lite, run under node) at each
// strength setting, graded exactly like `fit-move-curve.mjs` grades people: a
// native Stockfish depth-12 read of the board after its pick, against the
// depth-12 read before, on 600 positions from the same rated games (9th move
// on, contested). Measured 2026-10-22: UCI_Elo 1320/1414 ≈ a human 1150, 1679
// ≈ 1650, Skill 0 ≈ 1150, Skill 3 ≈ 1650, Skill 5 ≈ 2150.
//   node scripts/meter/engine-move-curve.mjs <shard i> <of n>   (one process per shard)
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const [SHARD, OF] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 1)];
const OUT = process.env.OUT_DIR ?? '/tmp/claude-0/strength';
const NPOS = Number(process.env.NPOS ?? 600), NODES = Number(process.env.NODES ?? 50000);
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const cands = [];
for (const d of ['/tmp/claude-0/meter/eng', '/tmp/claude-0/meter/eng4']) for (const f of readdirSync(d).filter((x) => x.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(`${d}/${f}`, 'utf8').split('\n')) {
    if (!line) continue; const g = JSON.parse(line);
    for (let p = 16; p < g.sans.length; p++) { const a = g.reads[p]; if (!a || a.mate != null || a.cp == null) continue; const before = p % 2 === 0 ? a.cp : -a.cp; if (Math.abs(before) <= 300) cands.push({ g, p, before }); }
  }
}
const picked = []; const used = new Set();
while (picked.length < NPOS) { const i = Math.floor(rnd() * cands.length); if (used.has(i)) continue; used.add(i); picked.push(cands[i]); }
const positions = picked.map(({ g, p, before }) => { const c = new Chess(); for (let k = 0; k < p; k++) c.move(g.sans[k]); return { fen: c.fen(), before }; });

const SETTINGS = [];
for (const s of [0, 1, 2, 3, 5, 8, 12, 20]) SETTINGS.push({ name: `skill${s}`, opts: [['UCI_LimitStrength', 'false'], ['Skill Level', String(s)]] });
for (const e of [1320, 1414, 1679]) SETTINGS.push({ name: `elo${e}`, opts: [['UCI_LimitStrength', 'true'], ['UCI_Elo', String(e)], ['Skill Level', '20']] });
const mine = SETTINGS.filter((_, i) => i % OF === SHARD);

function engine(cmd, args) {
  const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = ''; const listeners = new Set();
  p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); for (const f of [...listeners]) f(l); } });
  const send = (s) => p.stdin.write(s + '\n');
  const until = (re) => new Promise((done) => { const f = (l) => { if (re.test(l)) { listeners.delete(f); done(l); } }; listeners.add(f); });
  const search = (fen, go) => new Promise((done) => {
    let score = null;
    const f = (l) => {
      const m = l.match(/ score (cp|mate) (-?\d+)/); if (m) score = m[1] === 'cp' ? Number(m[2]) : (Number(m[2]) > 0 ? 10000 : -10000);
      if (l.startsWith('bestmove')) { listeners.delete(f); done({ best: l.split(' ')[1], score }); }
    };
    listeners.add(f); send(`position fen ${fen}`); send(go);
  });
  return { send, until, search, kill: () => p.kill() };
}
const ref = engine('/usr/games/stockfish', []); ref.send('uci'); await ref.until(/^uciok/); ref.send('setoption name Hash value 64');
const cache = new Map();
async function refEval(fen) { // mover-of-fen POV → convert to white POV
  if (cache.has(fen)) return cache.get(fen);
  const c = new Chess(fen);
  let v;
  if (c.isCheckmate()) v = c.turn() === 'w' ? -10000 : 10000;
  else if (c.isDraw()) v = 0;
  else { const r = await ref.search(fen, 'go depth 12'); v = (r.score ?? 0) * (c.turn() === 'w' ? 1 : -1); }
  cache.set(fen, v); return v;
}
const results = {};
for (const st of mine) {
  const eng = engine('node', [new URL('../../node_modules/stockfish/bin/stockfish-18-lite-single.js', import.meta.url).pathname]);
  eng.send('uci'); await eng.until(/^uciok/);
  for (const [k, v] of st.opts) eng.send(`setoption name ${k} value ${v}`);
  eng.send('isready'); await eng.until(/^readyok/);
  const c = { n: 0, sum: 0, m100: 0, m200: 0, m300: 0 };
  for (let i = 0; i < positions.length; i++) {
    const { fen, before } = positions[i];
    eng.send('ucinewgame');
    const r = await eng.search(fen, `go nodes ${NODES}`);
    const b = new Chess(fen); const white = b.turn() === 'w';
    try { b.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }); } catch { continue; }
    const after = await refEval(b.fen());
    const loss = Math.max(0, Math.min(1000, before - (white ? after : -after)));
    c.n++; c.sum += loss; if (loss >= 100) c.m100++; if (loss >= 200) c.m200++; if (loss >= 300) c.m300++;
    if ((i + 1) % 100 === 0) appendFileSync(`${OUT}/progress-${SHARD}.log`, `${st.name}: ${i + 1}/${positions.length}\n`);
  }
  eng.kill();
  results[st.name] = { n: c.n, acpl: +(c.sum / c.n).toFixed(1), m100: +(100 * c.m100 / c.n).toFixed(1), m200: +(100 * c.m200 / c.n).toFixed(1), m300: +(100 * c.m300 / c.n).toFixed(1) };
  writeFileSync(`${OUT}/engine-${SHARD}.json`, JSON.stringify(results, null, 1));
  appendFileSync(`${OUT}/progress-${SHARD}.log`, `DONE ${st.name} ${JSON.stringify(results[st.name])}\n`);
}
ref.kill();
appendFileSync(`${OUT}/progress-${SHARD}.log`, 'ALL DONE\n');
