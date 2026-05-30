// Given a pro opening id, walk the deepest most-played continuation from the
// player's games to a middlegame, then a few more plies of middlegame plan.
// Prints the deep spine + terminal FEN + MG-depth so a lesson can be authored.
import fs from 'node:fs'; import path from 'node:path';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const id = process.argv[2];                       // e.g. pro-gothamchess-italian
const player = process.argv[3] || 'gothamchess';
const SRC = `data/sources/${player}-chesscom`;
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
const entry = pro.openings.find((o) => o.id === id);
if (!entry) { console.error('no entry', id); process.exit(1); }
const startPgn = (process.argv[4] || entry.pgn).trim().split(/\s+/);

function sans(p){const i=p.search(/\n\n/);let b=i<0?p:p.slice(i);b=b.replace(/\{[^}]*\}/g,' ');let q;do{q=b;b=b.replace(/\([^()]*\)/g,' ');}while(b!==q);b=b.replace(/\b\d+\.+/g,' ').replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g,' ');return b.trim().split(/\s+/).filter(t=>t&&!/^\.+$/.test(t));}
const me = player.toLowerCase();
const games = [];
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.jsonl'))) {
  for (const l of fs.readFileSync(path.join(SRC, f), 'utf8').split('\n')) {
    if (!l) continue; let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.rules !== 'chess') continue;
    const isW = (j.white?.username || '').toLowerCase() === me;
    const isB = (j.black?.username || '').toLowerCase() === me;
    if (!isW && !isB) continue;
    games.push(sans(j.pgn || ''));
  }
}
function matches(m, pa) { if (m.length < pa.length) return false; for (let i = 0; i < pa.length; i++) if (m[i] !== pa[i]) return false; return true; }
let pool = games.filter((m) => matches(m, startPgn));
const ext = [...startPgn];
const MIN = 3;
// Phase 1: extend until games drop below MIN (the natural opening depth).
for (let ply = startPgn.length; ply < startPgn.length + 16; ply++) {
  const c = {}; for (const m of pool) if (m.length > ply) c[m[ply]] = (c[m[ply]] || 0) + 1;
  const r = Object.entries(c).sort((a, b) => b[1] - a[1]);
  if (!r.length || r[0][1] < MIN) break;
  ext.push(r[0][0]); pool = pool.filter((m) => m[ply] === r[0][0]);
}
const openingLen = ext.length;
// Phase 2: a few more plies of his most-played middlegame (>=2 games) for beats.
let pool2 = pool;
for (let ply = ext.length; ply < ext.length + 6; ply++) {
  const c = {}; for (const m of pool2) if (m.length > ply) c[m[ply]] = (c[m[ply]] || 0) + 1;
  const r = Object.entries(c).sort((a, b) => b[1] - a[1]);
  if (!r.length || r[0][1] < 2) break;
  ext.push(r[0][0]); pool2 = pool2.filter((m) => m[ply] === r[0][0]);
}
const line = ext.join(' ');
const c = new Chess(); let legal = true;
for (const m of ext) { try { c.move(m); } catch { legal = false; break; } }
console.log('opening spine (' + openingLen + ' plies):', ext.slice(0, openingLen).join(' '));
const oc = new Chess(); for (const m of ext.slice(0, openingLen)) oc.move(m);
console.log('  opening terminal FEN:', oc.fen());
console.log('  opening reaches MG:', JSON.stringify(reachesMiddlegame(ext.slice(0, openingLen).join(' '))));
console.log('full lesson line (' + ext.length + ' plies, legal=' + legal + '):', line);
console.log('  full terminal FEN:', c.fen());
