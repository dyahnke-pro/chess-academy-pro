// Lists the tries of the tries bench that no candidate source weighs
// (`not-weighed`) or the human floor drops (`not-tempting`), with the board's
// shape, to classify them. Run after the bench with DANYA_TRIES_REPORT=1.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const rep = JSON.parse(fs.readFileSync(process.argv[2] ?? 'audit-reports/danya-tries.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('src/services/__fixtures__/danyaTries.reads.json', 'utf8'));
const byId = new Map(fx.map((t) => [`${t.id}|${t.try}`, t]));
console.log(JSON.stringify(rep.gates));
for (const r of rep.rows.filter((x) => x.gate === 'not-weighed' || x.gate === 'not-tempting')) {
  const t = byId.get(`${r.id}|${r.try}`);
  const m = new Chess(t.fen).move(t.try);
  const nonPK = t.fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').replace(/[pPkK]/g, '').length;
  console.log([r.gate.padEnd(12), r.id.padEnd(18), t.try.padEnd(8), r.nag.padEnd(3), m.piece, m.flags.padEnd(2), `nonPK=${nonPK}`, t.fen, '|', (t.his ?? '').slice(0, 110).replace(/\s+/g, ' ')].join(' '));
}
