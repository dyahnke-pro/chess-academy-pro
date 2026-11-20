// Today's read of each article board, from the STORED engine lines (no engine run).
// Boards whose tries need a read we don't have get null for those reads.
//   npx tsx stored-read.ts <article-reads.jsonl> <out.jsonl>
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { boardReadFacts } from '../src/services/boardReadFacts';
import { decideRead, readContextOf } from '../src/services/readDecider';
import { readHasShot } from '../src/services/positionReadComposer';
import type { AnalysisLine } from '../src/types';

const [, , inPath, outPath] = process.argv;
interface Row { id: string; fen: string; lines: Array<{ moves: string[]; cp: number; mate: number | null }> }
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

async function main(): Promise<void> {
  const rows = readFileSync(inPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row);
  const stored = new Map<string, AnalysisLine[]>();
  for (const r of rows) stored.set(key(r.fen), r.lines.map((l, i) => ({ rank: i + 1, evaluation: l.cp, mate: l.mate, moves: l.moves }) as unknown as AnalysisLine));
  writeFileSync(outPath, '');
  let n = 0; let missed = 0;
  for (const r of rows) {
    n += 1;
    const out: Record<string, unknown> = { id: r.id, fen: r.fen };
    try {
      const side = new Chess(r.fen).turn();
      const before = stored.get(key(r.fen)) ?? [];
      const read = (fen: string): Promise<AnalysisLine[] | null> => { const s = stored.get(key(fen)); if (!s) missed += 1; return Promise.resolve(s ?? null); };
      const pf = await boardReadFacts({ fen: r.fen, studentColor: side, rating: 1800, before, read, withhold: false, readTempting: true, engineFutures: false, story: null,
        tense: 'now', history: [], theory: false, studentNeedContext: null } as unknown as Parameters<typeof boardReadFacts>[0]);
      const decided = decideRead(pf.facts, readContextOf({
        fen: r.fen,
        top: before[0] ? { evaluation: before[0].evaluation, mate: before[0].mate ?? null } : null,
        bestUci: before[0]?.moves[0] ?? null,
        withheld: null,
        studentShot: readHasShot(r.fen, side, before, false),
      }));
      out.read = [...decided.facts.map((f) => f.text), decided.habit ?? ''].map((t) => t.trim()).filter(Boolean).join(' ');
      out.facts = pf.facts.map((f) => ({ kind: f.kind, text: f.text }));
    } catch (e) { out.error = String(e).slice(0, 300); }
    appendFileSync(outPath, `${JSON.stringify(out)}\n`);
    if (n % 20 === 0) console.log(`${n}/${rows.length} reads-missing=${missed}`);
  }
  console.log(`DONE reads-missing=${missed}`);
}
void main();
