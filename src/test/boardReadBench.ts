/** Real boards for the board read (`boardReadFacts`): Danya's annotated
 *  boards with the engine reads stored with them, and a deterministic reader
 *  (a stored line where the board has one, else a fixed legal line), so a
 *  read runs the whole computer stack without an engine and never drifts. */
import { Chess } from 'chess.js';
import tries from '../services/__fixtures__/danyaTries.reads.json';
import type { BoardReadInput } from '../services/boardReadFacts';
import type { AnalysisLine } from '../types';

interface Row { fen: string; reads: Array<{ evaluation: number; mate: number | null; moves: string[] }> }

/** One row per distinct board, in the fixture's order. */
export const BENCH_BOARDS: readonly Row[] = (() => {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of tries as unknown as Row[]) {
    if (seen.has(r.fen)) continue;
    seen.add(r.fen);
    out.push(r);
  }
  return out;
})();

function fixedLine(fen: string, n: number): string[] {
  const b = new Chess(fen);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const ms = b.moves({ verbose: true });
    if (!ms.length) break;
    const m = ms[(fen.length + i * 7) % ms.length];
    b.move(m);
    out.push(m.from + m.to + (m.promotion ?? ''));
  }
  return out;
}

function line(rank: number, evaluation: number, mate: number | null, moves: string[], depth: number): AnalysisLine {
  return { rank, evaluation, mate, moves, depth } as AnalysisLine;
}

/** The board read's input for a bench board; `reads` counts the engine asks. */
export function benchInput(r: Row, counter?: { reads: number }): BoardReadInput {
  const stored = new Map<string, { evaluation: number; mate: number | null; moves: string[] }>();
  for (const rd of r.reads) {
    try {
      const b = new Chess(r.fen);
      const m = rd.moves[0];
      b.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
      stored.set(b.fen(), { evaluation: rd.evaluation, mate: rd.mate, moves: rd.moves.slice(1) });
    } catch { /* a stored line that does not play is not a read */ }
  }
  return {
    fen: r.fen,
    studentColor: r.fen.split(' ')[1] === 'b' ? 'b' : 'w',
    rating: 1500,
    before: r.reads.slice(0, 3).map((l, k) => line(k + 1, l.evaluation, l.mate, l.moves, 14)),
    read: (fen) => {
      if (counter) counter.reads += 1;
      const hit = stored.get(fen);
      const l = hit ?? { evaluation: (fen.length * 13) % 200 - 100, mate: null, moves: fixedLine(fen, 8) };
      return Promise.resolve([line(1, l.evaluation, l.mate, l.moves, 12)]);
    },
    withhold: false,
    tense: 'now',
    history: [],
    theory: true,
    readTempting: true,
    studentNeedContext: null,
    story: null,
  };
}
