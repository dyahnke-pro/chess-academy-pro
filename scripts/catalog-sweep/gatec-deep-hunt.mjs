// Second-pass Gate C hunt: match remaining plan anchors against the STEP-4
// deep files (spineMoves + topModelGames pgns) and pro-game-references.
import { Chess } from 'chess.js';
import fs from 'fs';
import path from 'path';

const gatec = JSON.parse(fs.readFileSync('audit-reports/masterclass-sweep/gatec-reconnect.json', 'utf8'));
const plans = new Map(JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8')).map((p) => [p.id, p]));
const fk = (fen) => fen.split(' ').slice(0, 2).join(' ');

const want = new Map();
for (const t of [...gatec.notFound, ...gatec.foundNoPrefix]) {
  const p = plans.get(t.id);
  if (p) want.set(fk(p.criticalPositionFen), t.id);
}
const hits = new Map();
function scan(sans, src) {
  const c = new Chess();
  for (let i = 0; i < Math.min(sans.length, 44); i++) {
    try { if (!c.move(sans[i])) return; } catch { return; }
    const k = fk(c.fen());
    const pid = want.get(k);
    if (pid && !hits.has(pid)) hits.set(pid, { src, path: sans.slice(0, i + 1).join(' ') });
  }
}
function stripPgn(pgn) {
  let body = pgn.includes('\n\n') ? pgn.split('\n\n').pop() : pgn;
  body = body.replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\$\d+/g, '');
  return body.split(/\s+/).filter((m) => m && !['1-0', '0-1', '1/2-1/2', '*'].includes(m));
}
for (const dir of ['gothamchess-deep', 'danielnaroditsky-deep', 'samayraina-trees', 'fabianocaruana-deep', 'magnuscarlsen-deep']) {
  const full = path.join('data/sources', dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.json')) continue;
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8')); } catch { continue; }
    if (Array.isArray(d?.spineMoves)) scan(d.spineMoves, `${dir}/${f}:spine`);
    for (const g of d?.topModelGames ?? []) if (g?.pgn) scan(stripPgn(g.pgn), `${dir}/${f}:game`);
    // model-games sidecar files are arrays of games
    if (Array.isArray(d)) for (const g of d) if (g?.pgn) scan(stripPgn(g.pgn), `${dir}/${f}:mg`);
  }
}
try {
  const refs = JSON.parse(fs.readFileSync('src/data/pro-game-references.json', 'utf8'));
  for (const r of Array.isArray(refs) ? refs : refs.games ?? []) if (r?.pgn) scan(r.pgn.split(/\s+/), `ref:${r.id ?? '?'}`);
} catch {}
try {
  const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
  for (const g of mg) if (g?.pgn) scan(g.pgn.split(/\s+/), `model:${g.id}`);
} catch {}
console.log(`hits=${hits.size} of ${want.size}`);
for (const [pid, h] of hits) console.log(`  ${pid}\n    via ${h.src}\n    (${h.path.split(' ').length}p) ${h.path.slice(0, 120)}`);
fs.writeFileSync('audit-reports/masterclass-sweep/gatec-deep-hits.json', JSON.stringify(Object.fromEntries(hits), null, 1));
