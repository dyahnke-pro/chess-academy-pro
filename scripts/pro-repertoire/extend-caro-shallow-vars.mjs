// Extend the two genuinely-shallow Caro variation PGNs to their
// data-derived middlegame spines (from gothamchess-deep extraction +
// the cluster walk). Every move chess.js-validated before write.
// Other variations already reach the middlegame (audit 2026-05-29).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const FILE = 'src/data/pro-repertoires.json';
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const caro = d.openings.find((o) => o.id === 'pro-gothamchess-caro-kann');

// name → data-derived deeper spine (his most-played continuation)
const EXTENSIONS = {
  'Advance Variation 3.e5 c5':
    'e4 c6 d4 d5 e5 c5 dxc5 e6 a3 Bxc5 Nf3 Nc6 Bd3 Nge7 b4 Bb6',
  'Fantasy Variation 3.f3':
    'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6',
};

function validate(pgn) {
  const c = new Chess();
  for (const m of pgn.trim().split(/\s+/)) c.move(m); // throws if illegal
  return c.fen();
}

let changed = 0;
for (const v of caro.variations) {
  const ext = EXTENSIONS[v.name];
  if (!ext) continue;
  const fen = validate(ext); // throws on any illegal move
  const oldPlies = v.pgn.trim().split(/\s+/).length;
  const newPlies = ext.trim().split(/\s+/).length;
  v.pgn = ext;
  changed++;
  console.log(`✓ ${v.name}: ${oldPlies} → ${newPlies} plies | endFEN ${fen}`);
}

if (changed !== Object.keys(EXTENSIONS).length) {
  console.error(`EXPECTED ${Object.keys(EXTENSIONS).length} edits, made ${changed}`);
  process.exit(1);
}

fs.writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
console.log(`wrote ${FILE} (${changed} variations extended)`);
