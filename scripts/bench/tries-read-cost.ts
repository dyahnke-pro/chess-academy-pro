// How many EXTRA engine reads a board costs for the moves weighed past the
// eye (`consideredTries`): the board read (`boardReadFacts`) reads every
// candidate the eye offers plus every considered move it does not.
// Run: npx tsx scripts/bench/tries-read-cost.ts
import fs from 'node:fs';
import { candidateMoves } from '../../src/services/weighedMoves';
import { consideredTries, planTries } from '../../src/services/tryCandidates';

const tries = JSON.parse(fs.readFileSync('src/services/__fixtures__/danyaTries.reads.json', 'utf8')) as Array<{ fen: string }>;
const fens = [...new Set(tries.map((t) => t.fen))];
let eye = 0, planOnly = 0, all = 0, max = 0;
const byWhy: Record<string, number> = {};
for (const fen of fens) {
  const weighed = new Set(candidateMoves(fen, 1800, { played: null, scored: null }).map((c) => c.uci));
  eye += weighed.size;
  planOnly += planTries(fen).filter((t) => !weighed.has(t.uci)).length;
  const extra = [...consideredTries(fen)].filter(([u]) => !weighed.has(u));
  all += extra.length;
  max = Math.max(max, extra.length);
  for (const [, c] of extra) byWhy[c.why] = (byWhy[c.why] ?? 0) + 1;
}
const n = fens.length;
console.log(JSON.stringify({ boards: n, eyeReads: +(eye / n).toFixed(1), planExtraBefore: +(planOnly / n).toFixed(1), extraNow: +(all / n).toFixed(1), maxExtra: max, byWhy: Object.fromEntries(Object.entries(byWhy).map(([k, v]) => [k, +(v / n).toFixed(1)])) }));
