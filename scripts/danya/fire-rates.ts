// Fire rate of the Danya have-check computers over every board in board-facts.
// Usage: npx tsx scripts/danya/fire-rates.ts [board-facts.jsonl]
import { readFileSync } from 'fs';
import { Chess } from 'chess.js';
import { pawnCentre } from '../../src/services/pawnCentre';
import { tensionKept } from '../../src/services/tensionRelease';
import { inaccessibleHole } from '../../src/services/inaccessibleHole';
import { harmlessWeakPawns } from '../../src/services/harmlessWeakPawns';
import { wingWithoutPieces } from '../../src/services/wingWithoutPieces';
import { kingBoxMove } from '../../src/services/kingBox';

const SRC = process.argv[2] ?? 'audit-reports/danya-havecheck/board-facts-2026-11-19.jsonl';
interface Board { id: string; fen: string; best: string; lines: { moves: string[]; cp: number | null; mate: number | null }[] }
const boards: Board[] = readFileSync(SRC, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Board);
const tagged = JSON.parse(readFileSync('audit-reports/danya-havecheck/no-computer-tagged-2026-11-19.json', 'utf8')) as { eConcepts: { concept: string; boards: string[] }[] };
const need = (concept: string): Set<string> => new Set(tagged.eConcepts.find((e) => e.concept === concept)?.boards ?? []);
const turn = (fen: string) => new Chess(fen).turn();

const COMPUTERS: Record<string, { concept: string; run: (b: Board) => { text: string } | null }> = {
  pawnCentre: { concept: 'centre', run: (b) => pawnCentre(b.fen, turn(b.fen)) },
  tensionKept: { concept: 'tensionGain', run: (b) => tensionKept(b.fen, b.lines) },
  // A move fact: read on the engine's best move of every board.
  inaccessibleHole: { concept: 'inaccessibleHole', run: (b) => inaccessibleHole(b.fen, b.best, turn(b.fen)) },
  wingWithoutPieces: { concept: 'fileNeedsPiece', run: (b) => wingWithoutPieces(b.fen, b.best) },
  kingBoxMove: { concept: 'rookMate', run: (b) => kingBoxMove(b.fen, b.best) },
  harmlessWeakPawns: { concept: 'heldWeakPawns', run: (b) => harmlessWeakPawns(b.fen, turn(b.fen), b.lines[0] ?? null) },
};
for (const [name, c] of Object.entries(COMPUTERS)) {
  const needed = need(c.concept);
  let hit = 0; let elsewhere = 0;
  const lines: string[] = [];
  for (const b of boards) {
    const r = c.run(b);
    if (!r) continue;
    if (needed.has(b.id)) hit++; else elsewhere++;
    lines.push(`  ${needed.has(b.id) ? '*' : ' '} ${b.id}: ${r.text}`);
  }
  console.log(`${name}: needing boards ${hit}/${needed.size}, elsewhere ${elsewhere}/${boards.length - needed.size}`);
  if (process.env.VERBOSE) console.log(lines.join('\n'));
}
