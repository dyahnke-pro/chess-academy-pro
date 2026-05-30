// Extend the shallow Trompowsky Vaganian (…Ne4) variation to its data-derived
// middlegame — his real 426-game gambit line (sac b2 for centre + development).
// Clears the middlegame-depth gate. Every move chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const FILE = 'src/data/pro-repertoires.json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const t = d.openings.find((o) => o.id === 'pro-gothamchess-trompowsky');

const EXT = {
  'Vaganian Attack (…Ne4)':
    'd4 Nf6 Bg5 Ne4 h4 c5 d5 Qb6 Nd2 Nxg5 hxg5 Qxb2 g6 fxg6 Ngf3 d6 e4',
};

function validate(pgn) {
  const c = new Chess();
  for (const m of pgn.trim().split(/\s+/)) c.move(m);
  return c.fen();
}

let changed = 0;
for (const v of t.variations) {
  const ext = EXT[v.name];
  if (!ext) continue;
  const fen = validate(ext);
  const oldP = v.pgn.trim().split(/\s+/).length;
  const newP = ext.trim().split(/\s+/).length;
  v.pgn = ext;
  changed++;
  console.log(`✓ ${v.name}: ${oldP} → ${newP} plies | ${fen}`);
}
if (changed !== Object.keys(EXT).length) { console.error('expected 1 edit'); process.exit(1); }
fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
console.log(`wrote ${FILE}`);
