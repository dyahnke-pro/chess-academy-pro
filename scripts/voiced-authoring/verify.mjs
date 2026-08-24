// THE TWO HARD GATES for a voiced file (run before every commit):
//   1. bank-fidelity — {ply,t,fen,line} mirror the bank exactly.
//   2. board-truth   — every square token a `spoken` line names is scanned
//                      against that move's fen (occupant printed for your eye).
//   node scripts/voiced-authoring/verify.mjs <id>
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';
import { readBank, VOICED } from './lib.mjs';
import { readFileSync } from 'node:fs';
const id = process.argv[2];
const bank = readBank(id);
const v = JSON.parse(readFileSync(`${VOICED}/${id}.json`, 'utf8'));
let fail = 0;
if (v.moves.length !== bank.moves.length) { console.log('LEN MISMATCH'); fail++; }
v.moves.forEach((m, i) => {
  const b = bank.moves[i];
  if (m.ply !== b.ply || m.t !== b.t || m.fen !== b.fen || JSON.stringify(m.line) !== JSON.stringify(b.line)) {
    console.log(`FIDELITY BREAK idx${i}`); fail++;
  }
});
v.moves.forEach((m, i) => {
  if (!m.spoken) return;
  const c = new Chess(m.fen);
  const toks = [...new Set((m.spoken.match(/\b[a-h][1-8]\b/g) || []))];
  const tbl = toks.map((sq) => { const p = c.get(sq); return `${sq}:${p ? p.color + p.type : '--'}`; });
  console.log(`idx${i} ply${m.ply} [${tbl.join(' ')}]`);
});
console.log(fail ? `FAIL ${fail}` : 'FIDELITY PASS — now eyeball the board-truth table above');
process.exit(fail ? 1 : 0);
