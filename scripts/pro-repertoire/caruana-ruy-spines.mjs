// Derive Caruana's most-common deep line per Ruy Lopez sub-variation from his
// real OTB games, so variation spines + beats are data-grounded (not memory).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const raw = fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn', 'utf8').replace(/\r\n/g, '\n');
const games = raw.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
const H = (g, k) => { const m = g.match(new RegExp(`\\[${k} "([^"]*)"\\]`)); return m ? m[1] : null; };

// Caruana = White in the Ruy. Sub-variations keyed by the defining prefix.
const VARS = {
  'Berlin Defence (d3)': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'd3'],
  'Berlin — 4.O-O / Endgame': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O'],
  'Open Ruy': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Nxe4'],
  'Marshall / Anti-Marshall': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O'],
  'Exchange': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'],
};

// For each sub-variation: gather White-Caruana games matching the prefix, then
// frequency-rank the continuation move-by-move to build the most-common spine.
for (const [name, prefix] of Object.entries(VARS)) {
  const matched = [];
  for (const g of games) {
    const w = H(g, 'White');
    if (!(w || '').toLowerCase().includes('caruana')) continue;
    let c = new Chess(), sans;
    try { c.loadPgn(g, { sloppy: true }); sans = c.history(); } catch { continue; }
    if (sans.length < prefix.length + 6) continue;
    if (!prefix.every((m, i) => sans[i] === m)) continue;
    matched.push(sans);
  }
  // most-common continuation walk
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
  console.log(`\n=== ${name}  (${matched.length} games)`);
  console.log('  spine: ' + spine.join(' '));
}
