// DATA MINING step 1: discover Hikaru's real repertoire from his games.
// Frequency-rank his openings by color. Caution applied: only count rated games
// vs real opposition, and aggregate over volume so one-off blitz blunders don't
// register as repertoire. Reports opening families he plays MOST + win rates.
const fs = require('fs');
const dir = 'data/sources/hikaru-chesscom';

// classify an opening by its first ~6 plies into a named family (ECO-ish)
function familyOf(sans, hikaruWhite) {
  const k = sans.slice(0, 6).join(' ');
  // White repertoire (Hikaru's first move)
  if (hikaruWhite) {
    if (/^e4 e5 Nf3 Nc6 Bb5/.test(k)) return 'W: Ruy Lopez';
    if (/^e4 e5 Nf3 Nc6 Bc4/.test(k)) return 'W: Italian';
    if (/^e4 e5 Nf3 Nc6 d4/.test(k)) return 'W: Scotch';
    if (/^e4 c5 Nf3 d6 d4/.test(k) || /^e4 c5 Nf3 Nc6 d4/.test(k)) return 'W: Open Sicilian';
    if (/^e4 c5 Nf3 .* Bb5/.test(k) || /^e4 c5 .*Bb5/.test(k)) return 'W: Rossolimo/Moscow';
    if (/^e4 c5 c3/.test(k)) return 'W: Alapin';
    if (/^e4 c5 Nc3/.test(k)) return 'W: Closed/Grand Prix Sicilian';
    if (/^e4 e6/.test(k)) return 'W: vs French';
    if (/^e4 c6/.test(k)) return 'W: vs Caro-Kann';
    if (/^e4 d5/.test(k)) return 'W: vs Scandinavian';
    if (/^e4 d6/.test(k) || /^e4 g6/.test(k)) return 'W: vs Pirc/Modern';
    if (/^e4 Nf6/.test(k)) return 'W: vs Alekhine';
    if (/^e4/.test(k)) return 'W: e4 (other)';
    if (/^d4 d5 c4/.test(k)) return 'W: Queen\'s Gambit';
    if (/^d4 Nf6 c4 g6/.test(k)) return 'W: vs King\'s Indian/Grünfeld';
    if (/^d4 Nf6 c4 e6/.test(k)) return 'W: vs Nimzo/QID';
    if (/^d4/.test(k)) return 'W: d4 (other)';
    if (/^Nf3/.test(k)) return 'W: Réti/KIA';
    if (/^c4/.test(k)) return 'W: English';
    if (/^b3/.test(k)) return 'W: Larsen/Nimzo-Larsen';
    if (/^f4/.test(k)) return 'W: Bird';
    if (/^g3/.test(k)) return 'W: King\'s Fianchetto';
    return 'W: other (' + sans[0] + ')';
  }
  // Black repertoire (Hikaru responds)
  if (/^e4 c5/.test(k)) return 'B: Sicilian';
  if (/^e4 e5/.test(k)) return 'B: 1...e5 (Ruy/Italian/etc)';
  if (/^e4 c6/.test(k)) return 'B: Caro-Kann';
  if (/^e4 e6/.test(k)) return 'B: French';
  if (/^e4 d6|^e4 g6/.test(k)) return 'B: Pirc/Modern';
  if (/^e4 Nf6/.test(k)) return 'B: Alekhine';
  if (/^e4/.test(k)) return 'B: vs e4 (other)';
  if (/^d4 Nf6 c4 g6.*d5/.test(k)) return 'B: Grünfeld';
  if (/^d4 Nf6 c4 g6/.test(k)) return 'B: King\'s Indian';
  if (/^d4 Nf6 c4 e6/.test(k)) return 'B: Nimzo/QID';
  if (/^d4 d5/.test(k)) return 'B: QGD/Slav';
  if (/^d4 f5/.test(k)) return 'B: Dutch';
  if (/^d4/.test(k)) return 'B: vs d4 (other)';
  if (/^c4/.test(k)) return 'B: vs English';
  if (/^Nf3/.test(k)) return 'B: vs Réti';
  return 'B: other';
}

const white = {}, black = {};
let scanned = 0, used = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(dir + '/' + f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (!g.pgn) continue;
    scanned++;
    const w = (g.pgn.match(/\[White "([^"]+)"/) || [])[1] || '';
    const b = (g.pgn.match(/\[Black "([^"]+)"/) || [])[1] || '';
    const rated = !/\[Rated "false"\]/.test(g.pgn);
    if (!rated) continue;
    const hikaruWhite = /hikaru|nakamura/i.test(w);
    const hikaruBlack = /hikaru|nakamura/i.test(b);
    if (!hikaruWhite && !hikaruBlack) continue;
    const res = (g.pgn.match(/\[Result "([^"]+)"/) || [])[1];
    const sans = g.pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\$\d+/g, ' ').trim().split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
    if (sans.length < 8) continue;
    used++;
    const fam = familyOf(sans, hikaruWhite);
    const bucket = hikaruWhite ? white : black;
    bucket[fam] = bucket[fam] || { games: 0, wins: 0 };
    bucket[fam].games++;
    const won = (hikaruWhite && res === '1-0') || (hikaruBlack && res === '0-1');
    if (won) bucket[fam].wins++;
  }
}
function report(label, bucket) {
  console.log(`\n=== ${label} ===`);
  const total = Object.values(bucket).reduce((a, x) => a + x.games, 0);
  Object.entries(bucket).sort((a, b) => b[1].games - a[1].games).slice(0, 14).forEach(([fam, s]) => {
    console.log(`  ${fam.padEnd(34)} ${String(s.games).padStart(6)} games (${(s.games / total * 100).toFixed(1)}%)  win ${(s.wins / s.games * 100).toFixed(0)}%`);
  });
}
console.log(`scanned ${scanned} games, used ${used} rated Hikaru games`);
report('HIKARU AS WHITE', white);
report('HIKARU AS BLACK', black);
