// Relaxed grounding for the remaining SHORT pro-rep plans: match each plan's
// criticalPositionFen (fen4) at ANY ply in the pros' archives (not just the exact
// move-number), then anchor 8 real plies from a masterclass-depth point. Prefers
// student WINS. Catches plans whose FEN occurs at a different ply / transposes.
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const mp = require('../../src/data/middlegame-plans.json');
const plans = Array.isArray(mp) ? mp : mp.plans;
const repo = require('../../src/data/pro-repertoires.json');
const fen4 = (f) => f.split(' ').slice(0, 4).join(' ');

// targets = short plans only
const targets = new Map(); // fen4 -> [planId]
for (const p of plans) {
  if (!/gothamchess|pronaro/i.test(p.id) || /-endgame$/.test(p.id)) continue;
  const pl = p.playableLines && p.playableLines[0];
  if (pl && pl.moves && pl.moves.length >= 8) continue;
  const k = fen4(p.criticalPositionFen);
  if (!targets.has(k)) targets.set(k, []);
  targets.get(k).push(p.id);
}
console.error(`relaxed targets: ${targets.size} positions / ${[...targets.values()].flat().length} plans`);

const result = {};
const grounded = new Set();
function movesFromPgn(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ');
  return body.split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}
function consider(sans, meta) {
  if (sans.length < 22) return;
  const c = new Chess(); const fens = [''];
  for (let i = 0; i < sans.length; i++) { let r; try { r = c.move(sans[i]); } catch { break; } if (!r) break; fens.push(c.fen()); }
  const len = fens.length - 1;
  for (let P = 6; P <= len; P++) {
    const k = fen4(fens[P]);
    if (!targets.has(k)) continue;
    const A = Math.max(P, 24);
    if (A + 8 > len) continue;
    for (const id of targets.get(k)) {
      if (!result[id] || (meta.preferred && !result[id].preferred)) {
        result[id] = { fen: fens[A], anchorPly: A, matchPly: P, moves: sans.slice(A, A + 8), endFen: fens[A + 8], ...meta };
      }
      grounded.add(id);
    }
  }
}
const ARCHIVES = [
  { dir: 'data/sources/gothamchess-chesscom', re: /gothamchess/i },
  { dir: 'data/sources/danielnaroditsky-chesscom', re: /naroditsky/i },
];
let scanned = 0;
for (const { dir, re } of ARCHIVES) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(dir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let game; try { game = JSON.parse(line); } catch { continue; }
      if (!game.pgn) continue;
      scanned++;
      if (scanned % 30000 === 0) console.error(`  …${scanned} games, grounded ${grounded.size}/${targets.size ? [...targets.values()].flat().length : 0}`);
      const w = (game.pgn.match(/\[White "([^"]+)"/) || [])[1] || '?';
      const res = (game.pgn.match(/\[Result "([^"]+)"/) || [])[1] || '?';
      const studentWhite = re.test(w);
      const win = (studentWhite && res === '1-0') || (!studentWhite && res === '0-1');
      consider(movesFromPgn(game.pgn), { url: game.url, opponent: '?', outcome: win ? 'win' : res, preferred: win, src: 'relaxed' });
    }
  }
}
fs.writeFileSync('audit-reports/grounded-relaxed.json', JSON.stringify(result, null, 2));
console.error(`RELAXED FINAL: grounded ${grounded.size}/${[...targets.values()].flat().length} short plans`);
