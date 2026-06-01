// Surface Caruana's best decisive OTB wins per opening (strongest opponent,
// deepest) from the pgnmentor corpus — candidates for model games.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const raw = fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn', 'utf8').replace(/\r\n/g, '\n');
const games = raw.split(/\n\n(?=\[Event )/).map((s) => s.trim()).filter(Boolean);
const H = (g, k) => { const m = g.match(new RegExp(`\\[${k} "([^"]*)"\\]`)); return m ? m[1] : null; };

const OPEN = [
  { id: 'ruy-lopez', color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { id: 'italian', color: 'white', prefix: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { id: 'najdorf', color: 'black', prefix: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { id: 'taimanov', color: 'black', prefix: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'] },
  { id: 'nimzo-indian', color: 'black', prefix: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { id: 'french', color: 'black', prefix: ['e4', 'e6', 'd4', 'd5'] },
  { id: 'caro-kann', color: 'black', prefix: ['e4', 'c6'] },
  { id: 'kid', color: 'black', prefix: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] }, // require Bg7 (exclude many Grünfelds)
].sort((a, b) => b.prefix.length - a.prefix.length);

const best = {};
for (const g of games) {
  const w = H(g, 'White'), b = H(g, 'Black');
  const cw = (w || '').toLowerCase().includes('caruana'), cb = (b || '').toLowerCase().includes('caruana');
  if (!cw && !cb) continue;
  const side = cw ? 'white' : 'black';
  const res = H(g, 'Result');
  const win = (side === 'white' && res === '1-0') || (side === 'black' && res === '0-1');
  if (!win) continue;
  let c = new Chess(), sans;
  try { c.loadPgn(g, { sloppy: true }); sans = c.history(); } catch { continue; }
  if (sans.length < 24) continue;
  const cls = OPEN.find((o) => o.color === side && o.prefix.every((m, i) => sans[i] === m));
  if (!cls) continue;
  if (cls.id === 'kid' && sans[6] === 'd5') continue; // Grünfeld guard
  const opp = Number(H(g, side === 'white' ? 'BlackElo' : 'WhiteElo')) || 0;
  (best[cls.id] = best[cls.id] || []).push({
    opp, oppName: side === 'white' ? b : w, year: (H(g, 'Date') || '').slice(0, 4),
    event: H(g, 'Event'), eco: H(g, 'ECO'), plies: sans.length, side, res, pgn: sans.join(' '),
  });
}
for (const id of Object.keys(best)) {
  best[id].sort((a, b) => b.opp - a.opp || b.plies - a.plies);
  console.log('\n=== ' + id.toUpperCase());
  for (const x of best[id].slice(0, 4)) {
    console.log(`  vs ${x.oppName} (${x.opp}) ${x.year} ${x.eco} ${x.plies}plies | ${x.event}`);
  }
}
// Dump top-3 per opening as JSON for authoring
const out = {};
for (const id of Object.keys(best)) out[id] = best[id].slice(0, 3);
fs.writeFileSync('/tmp/caruana-model-candidates.json', JSON.stringify(out, null, 1));
console.log('\nwrote /tmp/caruana-model-candidates.json');
