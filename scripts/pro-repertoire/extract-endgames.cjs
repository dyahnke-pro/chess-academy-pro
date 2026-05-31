// PRO-REP ENDGAME EXTRACTOR — per opening, find the pro's REAL games that follow
// the opening (by the spine's fen4 reached at any ply), walk each to its final
// position, classify the ending type, and surface DECISIVE games (student win)
// that reach a real endgame (>= ply 50 / move 25). Output: candidate endgame
// lines (transition FEN where the ending crystallises + the real move tail) per
// opening, for hand-authoring per the locked endgame rule. NO fabrication —
// Stockfish/classification only LOCATES; every move is from a real game.
//
// Usage: node scripts/pro-repertoire/extract-endgames.cjs <openingId>
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const repo = require('../../src/data/pro-repertoires.json');

const openingId = process.argv[2];
if (!openingId) { console.error('usage: extract-endgames.cjs <openingId>'); process.exit(1); }
const opening = repo.openings.find((o) => o.id === openingId);
if (!opening) { console.error('opening not found:', openingId); process.exit(1); }

const player = opening.playerId; // gothamchess | naroditsky
const archiveDir = player === 'naroditsky' ? 'data/sources/danielnaroditsky-chesscom' : 'data/sources/gothamchess-chesscom';
const playerRe = player === 'naroditsky' ? /naroditsky/i : /gothamchess/i;
const studentWhite = opening.color === 'white';

// spine identity = fen4 after the opening's first ~10 plies (variation-agnostic root)
function fen4(f) { return f.split(' ').slice(0, 4).join(' '); }
function prefixFens(pgn, depth) {
  const c = new Chess(); const out = [];
  for (const m of pgn.split(/\s+/).slice(0, depth)) { try { if (!c.move(m)) break; } catch { break; } out.push(fen4(c.fen())); }
  return out;
}
// identify the opening by a fen reached ~ply 6-10 of its spine (after the defining moves)
const spineFens = new Set(prefixFens(opening.pgn, 12).slice(4)); // plies 5-12

function classifyEnding(chess) {
  const counts = { wp: 0, bp: 0, wN: 0, bN: 0, wB: 0, bB: 0, wR: 0, bR: 0, wQ: 0, bQ: 0 };
  for (const row of chess.board()) for (const sq of row) {
    if (!sq) continue;
    const k = (sq.color === 'w' ? 'w' : 'b') + (sq.type === 'p' ? 'p' : sq.type.toUpperCase());
    counts[k]++;
  }
  const minors = (s) => counts[s + 'N'] + counts[s + 'B'];
  const heavy = (s) => counts[s + 'R'] + counts[s + 'Q'];
  const totalPieces = Object.values(counts).reduce((a, b) => a + b, 0);
  // only call it an endgame if material is reduced (no queens OR <= ~14 pieces)
  const queens = counts.wQ + counts.bQ;
  if (totalPieces > 16) return null;
  let type = '';
  if (queens > 0) type = 'Q' + (heavy('w') + heavy('b') - queens > 0 ? '+pieces' : '+P');
  else if (counts.wR + counts.bR > 0 && minors('w') + minors('b') > 0) type = 'R+minor+P';
  else if (counts.wR + counts.bR > 0) type = 'R+P';
  else if (minors('w') + minors('b') > 0) type = 'minor+P';
  else type = 'K+P';
  return { type, counts, totalPieces };
}

const candidates = [];
let scanned = 0, matched = 0;
for (const file of fs.readdirSync(archiveDir).filter((f) => f.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(archiveDir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (!g.pgn) continue;
    scanned++;
    const white = (g.pgn.match(/\[White "([^"]+)"/) || [])[1] || '';
    const black = (g.pgn.match(/\[Black "([^"]+)"/) || [])[1] || '';
    const isStudentWhite = playerRe.test(white);
    const isStudentBlack = playerRe.test(black);
    if (!isStudentWhite && !isStudentBlack) continue;
    // student must be on the repertoire's side
    if (studentWhite && !isStudentWhite) continue;
    if (!studentWhite && !isStudentBlack) continue;
    const res = (g.pgn.match(/\[Result "([^"]+)"/) || [])[1];
    const studentWon = (studentWhite && res === '1-0') || (!studentWhite && res === '0-1');
    if (!studentWon) continue;
    const sans = g.pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ').trim().split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    if (sans.length < 50) continue; // need a real endgame
    const c = new Chess(); const fens = ['']; let ok = true;
    for (const m of sans) { try { if (!c.move(m)) { ok = false; break; } } catch { ok = false; break; } fens.push(fen4(c.fen())); }
    if (!ok) continue;
    // must pass through the opening's spine
    let hit = false; for (let i = 4; i < Math.min(fens.length, 16); i++) if (spineFens.has(fens[i])) { hit = true; break; }
    if (!hit) continue;
    matched++;
    // find the ply where a TRUE endgame crystallises: <=12 pieces total AND
    // (no queens, OR <=10 pieces). Scan from move 24 (ply 48) so we skip the
    // queens-on middlegame and catch the real conversion.
    const replay = new Chess(); let transPly = -1, ending = null;
    const fullFens = [''];
    for (let i = 0; i < sans.length; i++) {
      replay.move(sans[i]); fullFens.push(replay.fen());
      if (i >= 44 && transPly < 0) {
        const e = classifyEnding(replay);
        const queens = e && (e.counts.wQ + e.counts.bQ);
        if (e && e.totalPieces <= 14 && (queens === 0 || e.totalPieces <= 11)) { transPly = i + 1; ending = e; }
      }
    }
    if (transPly < 0 || !ending) continue;
    candidates.push({
      url: g.url, opponent: isStudentWhite ? black : white, plies: sans.length, type: ending.type,
      transPly, transFen: fullFens[transPly],
      tail: sans.slice(transPly, transPly + 10),
    });
  }
}

// rank: prefer deepest game vs a real opponent, group by type
candidates.sort((a, b) => b.plies - a.plies);
const byType = {};
for (const c of candidates) (byType[c.type] = byType[c.type] || []).push(c);
console.log(`opening=${openingId} player=${player} studentSide=${opening.color}`);
console.log(`scanned student wins, matched opening spine: ${matched}, with real endgame: ${candidates.length}`);
console.log('\nendgame TYPE breakdown (>=10% candidates = a candidate endgame plan):');
const total = candidates.length || 1;
for (const [t, arr] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
  const pct = (arr.length / total * 100).toFixed(0);
  console.log(`  ${t}: ${arr.length} (${pct}%)`);
}
console.log('\nTOP candidates per type (deepest, real opponent):');
for (const [t, arr] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
  if (arr.length / total < 0.1) continue;
  const best = arr[0];
  console.log(`\n### ${t} — vs ${best.opponent} (${best.plies} plies)  ${best.url}`);
  console.log(`  transition @ply ${best.transPly}: ${best.transFen}`);
  console.log(`  tail: ${best.tail.join(' ')}`);
}
fs.mkdirSync('audit-reports', { recursive: true });
fs.writeFileSync(`audit-reports/endgames-${openingId}.json`, JSON.stringify({ openingId, byTypeCounts: Object.fromEntries(Object.entries(byType).map(([t, a]) => [t, a.length])), candidates: candidates.slice(0, 40) }, null, 1));
