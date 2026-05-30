// Ground every short pro-rep middlegame-plan playable line in a REAL game.
// EVERY move comes from an actual played game (David's hard rule).
// Sources, in priority order: deep-build topModelGames (curated real games per
// variation) then the raw chess.com archive. For each plan's criticalPositionFen
// we record the game's NEXT 8 plies. Output: audit-reports/grounded-plan-lines.json
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const mp = require('../src/data/middlegame-plans.json');
const plans = Array.isArray(mp) ? mp : (mp.plans || []);
const fen4 = (f) => f.split(' ').slice(0, 4).join(' ');
function halfmoves(fen) { const p = fen.split(' '); return (parseInt(p[5], 10) - 1) * 2 + (p[1] === 'b' ? 1 : 0); }

// Targets: every short pro-rep plan. Index by ply (H) then fen4.
const byPly = new Map(); // H -> Map(fen4 -> [planIds])
const allKeys = new Set();
let shortCount = 0;
for (const p of plans) {
  if (!/gothamchess|pronaro/i.test(p.id) || /-endgame$/.test(p.id)) continue;
  const pl = p.playableLines && p.playableLines[0];
  if (pl && pl.moves && pl.moves.length >= 8) continue;
  shortCount++;
  const H = halfmoves(p.criticalPositionFen);
  const k = fen4(p.criticalPositionFen);
  if (!byPly.has(H)) byPly.set(H, new Map());
  if (!byPly.get(H).has(k)) byPly.get(H).set(k, []);
  byPly.get(H).get(k).push(p.id);
  allKeys.add(k);
}
const targetPlies = new Set(byPly.keys());
console.error(`short plans: ${shortCount} | distinct positions: ${allKeys.size} | target plies: ${[...targetPlies].sort((a, b) => a - b).join(',')}`);

const result = {};
const grounded = new Set();

function movesFromPgn(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ');
  return body.split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}
function consider(sans, meta) {
  if (sans.length < 14) return;
  const maxH = Math.max(...targetPlies);
  const c = new Chess();
  const fens = ['']; // fens[k] = fen after k halfmoves
  for (let i = 0; i < sans.length; i++) {
    let r; try { r = c.move(sans[i]); } catch { return; }
    if (!r) return;
    fens.push(c.fen());
    const H = i + 1;
    if (H > maxH + 1) break;
    if (targetPlies.has(H)) {
      const k = fen4(fens[H]);
      const m = byPly.get(H);
      if (m && m.has(k)) {
        // variation confirmed at ply H. Anchor at masterclass depth: A>=16, but
        // keep H if already deep. Need 8 real plies after the anchor.
        const A = Math.max(H, 16);
        if (A + 8 <= sans.length) {
          const next8 = sans.slice(A, A + 8);
          for (const planId of m.get(k)) {
            if (!result[planId] || (meta.preferred && !result[planId].preferred)) {
              result[planId] = { fen: fens[A], anchorPly: A, matchPly: H, moves: next8, ...meta };
            }
            grounded.add(planId);
          }
        }
      }
    }
  }
}

// 1) deep-build topModelGames (curated real games)
for (const dir of ['gothamchess-deep', 'danielnaroditsky-deep']) {
  const base = `data/sources/${dir}`;
  if (!fs.existsSync(base)) continue;
  for (const f of fs.readdirSync(base).filter((x) => x.endsWith('.json'))) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8')); } catch { continue; }
    for (const g of d.topModelGames || []) {
      if (!g.pgn) continue;
      consider(movesFromPgn(g.pgn), { url: g.url, opponent: g.opponent, outcome: g.outcome, preferred: g.outcome === 'win', src: 'deep' });
    }
  }
}
console.error(`after deep-build games: grounded ${grounded.size}/${shortCount}`);

// 2) raw chess.com archive (Gotham) for the remainder
const arch = 'data/sources/gothamchess-chesscom';
if (fs.existsSync(arch)) {
  let scanned = 0;
  for (const file of fs.readdirSync(arch).filter((x) => x.endsWith('.jsonl'))) {
    if (grounded.size >= shortCount) break;
    for (const line of fs.readFileSync(path.join(arch, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let game; try { game = JSON.parse(line); } catch { continue; }
      if (!game.pgn) continue;
      scanned++;
      if (scanned % 25000 === 0) { console.error(`  …${scanned} archive games, grounded ${grounded.size}`); fs.writeFileSync('audit-reports/grounded-plan-lines.json', JSON.stringify(result, null, 2)); }
      const w = (game.pgn.match(/\[White "([^"]+)"/) || [])[1] || '?';
      const res = (game.pgn.match(/\[Result "([^"]+)"/) || [])[1] || '?';
      const studentWhite = /gothamchess/i.test(w);
      const win = (studentWhite && res === '1-0') || (!studentWhite && res === '0-1');
      consider(movesFromPgn(game.pgn), { url: game.url, opponent: '?', outcome: win ? 'win' : res, preferred: win, src: 'archive' });
    }
  }
  console.error(`scanned ${scanned} archive games`);
}

fs.mkdirSync('audit-reports', { recursive: true });
fs.writeFileSync('audit-reports/grounded-plan-lines.json', JSON.stringify(result, null, 2));
const ungrounded = [...allKeys].filter((k) => { for (const m of byPly.values()) if (m.has(k)) for (const id of m.get(k)) if (!result[id]) return true; return false; });
console.error(`FINAL: grounded ${grounded.size}/${shortCount} plans | ungrounded positions: ${allKeys.size - [...allKeys].filter((k) => { for (const m of byPly.values()) if (m.has(k) && m.get(k).some((id) => result[id])) return true; return false; }).length}`);
