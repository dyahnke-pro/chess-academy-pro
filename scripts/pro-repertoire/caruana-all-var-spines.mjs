// Derive data-supported sub-variations for every Caruana opening: for each
// candidate prefix, count his real games + walk the most-common deep spine.
// Only variations with enough games (>=15) + depth become real tabs.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const raw = fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn', 'utf8').replace(/\r\n/g, '\n');
const games = raw.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
const H = (g, k) => { const m = g.match(new RegExp(`\\[${k} "([^"]*)"\\]`)); return m ? m[1] : null; };

// opening -> Caruana's color + candidate { name: prefix-SAN } sub-variations.
const PLAN = {
  italian: { color: 'white', vars: {
    'Two Knights': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    'Giuoco Piano (c3 d3)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'],
    'Evans Gambit': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
  } },
  najdorf: { color: 'black', vars: {
    'English Attack (6.Be3)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3'],
    'Main 6.Bg5': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5'],
    'Fischer-Sozin (6.Bc4)': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bc4'],
    '6.f3 English': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'f3'],
  } },
  taimanov: { color: 'black', vars: {
    '6.Be3': ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'Qc7', 'Be3'],
    '6.g3': ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'a6', 'g3'],
    'English Attack (Be3 a6)': ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'a6', 'Be3'],
  } },
  'nimzo-indian': { color: 'black', vars: {
    'Rubinstein (4.e3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3'],
    'Saemisch (4.a3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3'],
    'Kasparov (4.Nf3)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Nf3'],
    'Leningrad (4.Bg5)': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5'],
  } },
  french: { color: 'black', vars: {
    'Advance (3.e5)': ['e4', 'e6', 'd4', 'd5', 'e5'],
    'Tarrasch (3.Nd2)': ['e4', 'e6', 'd4', 'd5', 'Nd2'],
    'Exchange (3.exd5)': ['e4', 'e6', 'd4', 'd5', 'exd5'],
    'Winawer (3.Nc3 Bb4)': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'],
  } },
  'caro-kann': { color: 'black', vars: {
    'Advance (3.e5)': ['e4', 'c6', 'd4', 'd5', 'e5'],
    'Exchange (3.exd5)': ['e4', 'c6', 'd4', 'd5', 'exd5'],
    'Classical (4…Bf5)': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
    'Panov (c4)': ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4'],
    'Fantasy (3.f3)': ['e4', 'c6', 'd4', 'd5', 'f3'],
  } },
  kid: { color: 'black', vars: {
    'Classical (Nf3 …e5)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
    'Saemisch (5.f3)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3'],
    'Four Pawns (5.f4)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4'],
    'Averbakh (5.Be2 6.Bg5)': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Be2', 'O-O', 'Bg5'],
  } },
};

for (const [oid, { color, vars }] of Object.entries(PLAN)) {
  console.log(`\n######## ${oid.toUpperCase()} (${color})`);
  for (const [name, prefix] of Object.entries(vars)) {
    const matched = [];
    for (const g of games) {
      const who = color === 'white' ? H(g, 'White') : H(g, 'Black');
      if (!(who || '').toLowerCase().includes('caruana')) continue;
      let c = new Chess(), sans;
      try { c.loadPgn(g, { sloppy: true }); sans = c.history(); } catch { continue; }
      if (sans.length < prefix.length + 6) continue;
      if (!prefix.every((m, i) => sans[i] === m)) continue;
      matched.push(sans);
    }
    if (matched.length < 12) { console.log(`  [skip ${matched.length}g] ${name}`); continue; }
    const spine = prefix.slice();
    while (spine.length < 24) {
      const onPath = matched.filter((s) => spine.every((m, i) => s[i] === m) && s.length > spine.length);
      if (onPath.length < 3) break;
      const counts = {};
      for (const s of onPath) counts[s[spine.length]] = (counts[s[spine.length]] || 0) + 1;
      const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (n < 3) break;
      spine.push(best);
    }
    console.log(`  [${matched.length}g] ${name}\n     ${spine.join(' ')}`);
  }
}
