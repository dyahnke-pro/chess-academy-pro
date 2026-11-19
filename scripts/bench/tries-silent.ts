// Why a weighed try of the tries bench says nothing and names no gate.
// Run: npx tsx scripts/bench/tries-silent.ts
import fs from 'node:fs';
import { Chess, type Color } from 'chess.js';
import { consideredTries } from '../../src/services/tryCandidates';

const rep = JSON.parse(fs.readFileSync('audit-reports/danya-tries.json', 'utf8')) as { rows: Array<{ id: string; try: string; gate: string }> };
const fx = JSON.parse(fs.readFileSync('src/services/__fixtures__/danyaTries.reads.json', 'utf8')) as Array<{ id: string; fen: string; try: string; reads: Array<{ evaluation: number; mate: number | null; moves: string[] }> }>;
for (const r of rep.rows.filter((x) => x.gate === 'not-weighed')) {
  const t = fx.find((x) => x.id === r.id && x.try === r.try)!;
  const m = new Chess(t.fen).move(t.try);
  const uci = m.from + m.to + (m.promotion ?? '');
  const c = consideredTries(t.fen).get(uci);
  const read = t.reads.find((x) => x.moves[0] === uci);
  const side = t.fen.split(' ')[1] as Color;
  const score = (x: { evaluation: number; mate: number | null }) => (x.mate !== null ? (x.mate > 0 ? 1 : -1) * 10000 : x.evaluation) * (side === 'w' ? 1 : -1);
  const best = [...t.reads].sort((a, b) => score(b) - score(a))[0];
  console.log(r.id.padEnd(40), t.try.padEnd(7), 'why=', c?.why ?? '-', 'read=', read ? `${read.evaluation}/${read.mate} len${read.moves.length}` : 'NONE', 'best=', `${best.moves[0]} ${best.evaluation}/${best.mate}`, 'nreads', t.reads.length);
}
