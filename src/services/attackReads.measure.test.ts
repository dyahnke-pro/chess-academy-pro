// The three attack reads measured on the recorded Danya boards (4,568 boards
// with their engine lines, `__fixtures__/danyaBoards209.reads.json`): how often
// each speaks, both seats, and sampled lines to read against their boards.
// ATTACK_MEASURE=1 npx vitest run src/services/attackReads.measure.test.ts
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { checkCensus, attackLeader, defenderArrival } from './attackReads';
import type { EngineLine } from './engineLineRead';
import { deflectionOn } from './deflection';
import { sideToMoveAs } from './threatOut';

type Reads = Record<string, Array<{ evaluation: number; mate: number | null; moves: string[] }>>;

describe.skipIf(!process.env.ATTACK_MEASURE)('attack reads on the Danya boards', () => {
  it('counts and samples', () => {
    const R = JSON.parse(readFileSync('src/services/__fixtures__/danyaBoards209.reads.json', 'utf8')) as Reads;
    const out: Record<string, { n: number; samples: Array<{ fen: string; text: string; line?: string[] }> }> = {
      census: { n: 0, samples: [] }, deflection: { n: 0, samples: [] }, deflectionPass: { n: 0, samples: [] }, leader: { n: 0, samples: [] }, arrival: { n: 0, samples: [] },
    };
    let boards = 0;
    for (const [key, ls] of Object.entries(R)) {
      const fen = `${key} 0 1`;
      try { new Chess(fen); } catch { continue; }
      boards += 1;
      const lines: EngineLine[] = ls.map((l) => ({ moves: l.moves, cp: l.mate == null ? l.evaluation : null, mate: l.mate }));
      const student = fen.split(' ')[1] as 'w' | 'b';
      const push = (k: string, r: { text: string; line?: string[] } | null): void => {
        if (!r) return;
        out[k].n += 1;
        if (out[k].samples.length < 40) out[k].samples.push({ fen, text: r.text, line: r.line });
      };
      push('census', checkCensus(fen, lines, student));
      push('leader', attackLeader(fen, lines, student, true));
      push('arrival', defenderArrival(fen, lines, student));
      const d = deflectionOn(fen);
      push('deflection', d ? { text: `${d.move} pulls the ${d.defender.piece} on ${d.defender.from} off ${d.target.square}; gain ${d.gain}`, line: d.line } : null);
      const pass = sideToMoveAs(fen, student === 'w' ? 'b' : 'w');
      const dp = pass ? deflectionOn(pass) : null;
      push('deflectionPass', dp ? { text: `${dp.move} pulls the ${dp.defender.piece} on ${dp.defender.from} off ${dp.target.square}; gain ${dp.gain}`, line: dp.line } : null);
    }
    writeFileSync('audit-reports/attack-reads-measure.json', JSON.stringify({ boards, ...out }, null, 1));
    console.log(boards, Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.n])));
  }, 600_000);
});
