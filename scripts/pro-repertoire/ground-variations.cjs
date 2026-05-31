// Complete the last 32 to standard, no guessing:
//  - 25 SYNTHETIC plans: match the variation's CANONICAL entry position (real theory,
//    chess.js-validated) transposition-proof (fen4 reached at ANY ply), anchor 8 real
//    plies from a masterclass-depth point in a student WIN.
//  - 7 FLAGGED plans: WALK-BACK -- match their real position, anchor DEEPER (where the
//    won game's advantage has materialised).
// Every move stays a real game move; Stockfish (later pass) only eval-picks soundness.
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const fen4 = (f) => f.split(' ').slice(0, 4).join(' ');
function posAfter(sans) { const c = new Chess(); for (const m of sans) c.move(m); return fen4(c.fen()); }

// canonical entry lines (real opening theory) per synthetic plan
const ENTRY = {
  // Rossolimo (white)
  'mp-pronaroRoss-nc6-maroczy': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'],
  'mp-pronaroRoss-nc6-b4push': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'],
  'mp-pronaroRoss-e6-taimanov': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6'],
  'mp-pronaroRoss-e6-ne5': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6'],
  'mp-pronaroRoss-bd7-conversion': ['e4', 'c5', 'Nf3', 'd6', 'Bb5+', 'Nd7'],
  'mp-pronaroRoss-bd7-attack': ['e4', 'c5', 'Nf3', 'd6', 'Bb5+', 'Nd7'],
  'mp-pronaroRoss-g6-maroczy': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6'],
  // Alekhine (black)
  'mp-pronaroAlek-twoknights-equality': ['e4', 'Nf6', 'e5', 'Nd5', 'Nc3'],
  'mp-pronaroAlek-twoknights-trade': ['e4', 'Nf6', 'e5', 'Nd5', 'Nc3'],
  'mp-pronaroAlek-modernquiet-conversion': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3'],
  'mp-pronaroAlek-modern-nb4': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3'],
  'mp-pronaroAlek-quiet-d5break': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3'],
  // KIA (white)
  'mp-pronaroKIA-symmetric-attack': ['Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O'],
  'mp-pronaroKIA-symmetric-e5push': ['Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O'],
  'mp-pronaroKIA-reti-attack': ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2'],
  'mp-pronaroKIA-reti-nc4': ['Nf3', 'd5', 'g3', 'Nf6', 'Bg2'],
  // Jobava London (white)
  'mp-pronaroJob-french-attack': ['d4', 'Nf6', 'Nc3', 'd5', 'Bf4', 'e6'],
  'mp-pronaroJob-slav-trade': ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6'],
  'mp-pronaroJob-slav-rad1': ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c6'],
  // Najdorf (black)
  'mp-pronaroNaj-english-race': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3'],
  'mp-pronaroNaj-adams-defense': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'h3'],
  // Ruy Lopez (white) — closed d3
  'mp-pronaroRuy-d3-positional': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'd3'],
  'mp-pronaroRuy-d3-flank': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'd3'],
  // Fantasy Caro (white)
  'mp-pronaroFantasy-kingside-attack': ['e4', 'c6', 'd4', 'd5', 'f3'],
  // Anti-Sicilian e6 (white)
  'mp-progothamchess-antisic-e6-open': ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6'],
};
// 7 flagged → walk-back: use their existing relaxed-grounded match position, anchor deeper
const relaxed = fs.existsSync('audit-reports/grounded-relaxed.json') ? require('../../audit-reports/grounded-relaxed.json') : {};
const WALKBACK = {};
for (const id of ['mp-progothamchess-french-rubinstein-qxd4', 'mp-progothamchess-qgd-tartakower-b6', 'mp-progothamchess-pirc-150-b5', 'mp-progothamchess-caro-panov', 'mp-pronaroNaj-classical-development', 'mp-pronaroJobava-central-queen-attack', 'mp-pronaroKID-makogonov-kingside']) {
  if (relaxed[id]) WALKBACK[id] = fen4(relaxed[id].fen); // their matched anchor's fen4 (we'll anchor deeper)
}

// build fen4 -> [ {planId, mode, deepBump} ]
const want = new Map();
for (const [id, sans] of Object.entries(ENTRY)) { const k = posAfter(sans); if (!want.has(k)) want.set(k, []); want.get(k).push({ id, mode: 'entry' }); }
for (const [id, k] of Object.entries(WALKBACK)) { if (!want.has(k)) want.set(k, []); want.get(k).push({ id, mode: 'walkback' }); }
console.error(`targets: ${Object.keys(ENTRY).length} synthetic + ${Object.keys(WALKBACK).length} walkback = ${want.size} positions`);

const result = {};
const candidates = {};
const grounded = new Set();
function movesFromPgn(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ');
  return body.split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}
function consider(sans, meta) {
  if (sans.length < 24) return;
  const CAP = 46; // no match/anchor needs beyond ~ply 44; cap replay for speed
  const c = new Chess(); const fens = [''];
  const stop = Math.min(sans.length, CAP);
  for (let i = 0; i < stop; i++) { let r; try { r = c.move(sans[i]); } catch { break; } if (!r) break; fens.push(c.fen()); }
  const len = fens.length - 1;
  for (let P = 5; P <= len; P++) {
    const k = fen4(fens[P]);
    if (!want.has(k)) continue;
    for (const { id, mode } of want.get(k)) {
      // entry: anchor a few moves past the entry into a real middlegame (>=24).
      // walkback: anchor deeper still (entry + ~12) so the won game's edge shows.
      const A = mode === 'walkback' ? Math.max(P + 12, 26) : Math.max(P + 8, 24);
      if (A + 8 > len) continue;
      const rec = { fen: fens[A], anchorPly: A, matchPly: P, moves: sans.slice(A, A + 8), endFen: fens[A + 8], ...meta };
      if (!candidates[id]) candidates[id] = [];
      if (meta.preferred && candidates[id].length < 8) candidates[id].push(rec);
      if (!result[id] || (meta.preferred && !result[id].preferred)) result[id] = rec;
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
      if (scanned % 20000 === 0) { console.error(`  …${scanned} games, grounded ${grounded.size}/${Object.keys(ENTRY).length + Object.keys(WALKBACK).length}`); fs.writeFileSync('audit-reports/grounded-variations.json', JSON.stringify(result, null, 2)); fs.writeFileSync('audit-reports/grounded-variations-candidates.json', JSON.stringify(candidates)); }
      const w = (game.pgn.match(/\[White "([^"]+)"/) || [])[1] || '?';
      const res = (game.pgn.match(/\[Result "([^"]+)"/) || [])[1] || '?';
      const studentWhite = re.test(w);
      const win = (studentWhite && res === '1-0') || (!studentWhite && res === '0-1');
      consider(movesFromPgn(game.pgn), { url: game.url, opponent: '?', outcome: win ? 'win' : res, preferred: win, src: 'variation' });
    }
  }
}
fs.writeFileSync('audit-reports/grounded-variations.json', JSON.stringify(result, null, 2));
fs.writeFileSync('audit-reports/grounded-variations-candidates.json', JSON.stringify(candidates));
console.error(`VARIATIONS FINAL: grounded ${grounded.size}/${Object.keys(ENTRY).length + Object.keys(WALKBACK).length}`);
