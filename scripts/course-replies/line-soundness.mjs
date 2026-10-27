// Every STUDENT move of every main line and variation in the course, checked by
// the engine (WO-COURSE-01 C) — the same check `subline-soundness.mjs` runs on
// the sublines. Written because the anti-openings were built with the same
// one-shot `execFileSync(stockfish)` that put 4.a3 / 5.b3 junk in sublines.
//
// A student move scoring ≥ LOSS_CP below the engine's best at depth DEPTH is
// flagged (both sides already decided → skipped). Gambit lines are reported
// with `gambit: true`: a sacrifice is the point of the line, so they are read
// by hand, never auto-flagged as wrong.
//
// Usage: node scripts/course-replies/line-soundness.mjs <shard i/n>
// → audit-reports/line-soundness/shard-<i>.jsonl (resumable).
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';

const root = new URL('../..', import.meta.url).pathname;
const [I, N] = (process.argv[2] ?? '0/1').split('/').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 12);
const LOSS_CP = Number(process.env.LOSS_CP ?? 100);
const DECIDED = 500;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const sources = [
  ['repertoire', arr(J('src/data/repertoire.json'))],
  ['pro', arr(J('src/data/pro-repertoires.json'))],
  ['gambit', arr(J('src/data/gambits.json'))],
  ['anti', arr(J('src/data/anti-openings.json'))],
];
const tokens = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

const lines = [];
for (const [src, list] of sources) for (const o of list) {
  if (!o?.id || !o.pgn) continue;
  lines.push({ key: `${o.id}::main`, src, color: o.color, sans: tokens(o.pgn) });
  (o.variations ?? []).forEach((v, i) => v.pgn && lines.push({ key: `${o.id}::var-${i}`, src, color: o.color, sans: tokens(v.pgn) }));
}
const mine = lines.filter((_, k) => k % N === I);
const outDir = root + 'audit-reports/line-soundness/';
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}shard-${I}.jsonl`;
const done = new Set(existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);

const eng = new Engine();
const t0 = Date.now();
let n = 0;
for (const L of mine) {
  if (done.has(L.key)) continue;
  const me = L.color === 'white' ? 'w' : 'b';
  const row = { key: L.key, src: L.src, gambit: L.src === 'gambit' || /gambit/i.test(L.key), flags: [] };
  const c = new Chess();
  for (let i = 0; i < L.sans.length; i++) {
    const fen = c.fen();
    let mv;
    try { mv = c.move(L.sans[i]); } catch { row.flags.push({ kind: 'illegal', ply: i, san: L.sans[i] }); break; }
    if (fen.split(' ')[1] !== me) continue;
    const best = await eng.analyse(fen, { depth: DEPTH });
    const uci = mv.from + mv.to + (mv.promotion ?? '');
    const played = best.best === uci ? best : await eng.analyse(fen, { depth: DEPTH, searchmoves: [uci] });
    if (best.score === null || played.score === null) continue;
    const loss = best.score - played.score;
    const decided = (best.score >= DECIDED && played.score >= DECIDED) || (best.score <= -DECIDED && played.score <= -DECIDED);
    if (loss >= LOSS_CP && !decided) row.flags.push({ kind: 'loses-material', ply: i, san: mv.san, best: best.best, loss, bestCp: best.score });
  }
  appendFileSync(outFile, JSON.stringify(row) + '\n');
  if (++n % 25 === 0) console.log(`[lines ${I}/${N}] ${n + done.size}/${mine.length} · ${Math.round((Date.now() - t0) / 60000)}min`);
}
eng.quit();
console.log(`[lines ${I}/${N}] done ${mine.length}`);
