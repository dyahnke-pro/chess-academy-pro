// One example board per reason of `reasonTries` from the tries bench's boards.
// Run: npx tsx scripts/bench/tries-why-sample.ts <why>
import fs from 'node:fs';
import { reasonTries } from '../../src/services/tryCandidates';

const want = process.argv[2] ?? 'mate-threat';
const tries = JSON.parse(fs.readFileSync('src/services/__fixtures__/danyaTries.reads.json', 'utf8')) as Array<{ id: string; fen: string }>;
let n = 0;
for (const t of tries) {
  const hits = reasonTries(t.fen).filter((r) => r.why === want);
  if (hits.length === 0) continue;
  console.log(t.id, t.fen, hits.map((h) => h.san).join(' '));
  if (++n >= 6) break;
}
