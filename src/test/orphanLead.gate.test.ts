// THE ORPHAN RULE (CLAUDE.md rule 2, step 2b(3)): no spoken fact starts by
// pointing outside itself ("It takes the …f5 break away", "after this"). Run
// over the 29 puzzle reads and the 5 Danya boards, every KEPT fact alone —
// a fact must stand on its own, wherever the decider places it.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import p5 from '../services/__fixtures__/puzzles5.reads.json';
import d5 from '../services/__fixtures__/danyaBoards5.reads.json';
import { fixtureReader, readDanyaBoard, readKey, type Reads } from './danyaBoardRead';
/** ORPHAN LEADS: a spoken fact may not start by pointing outside itself. */
const ORPHAN_LEAD = /^(?:It|This|That|These|Those|And|But)\b|^After this\b|^after this\b/;

const DANYA = [
  '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1',
  'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20',
  '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17',
  '4k3/7p/4PN2/p7/P6K/7P/1p4P1/8 b - - 0 48',
  'rnq2rk1/1pn3bp/p2p2p1/2pPp1PP/P1P1Pp2/2N2N2/1P1B1P2/R2QK2R b KQ - 0 16',
];
const kept: string[] = [];
beforeAll(async () => {
  const P = p5 as unknown as Reads; const D = d5 as unknown as Reads;
  const rows = readFileSync(`${process.cwd()}/src/services/__fixtures__/puzzles5.boards.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { fen: string });
  for (const r of rows) kept.push(...(await readDanyaBoard(r.fen, P[readKey(r.fen)] ?? [], fixtureReader(P))).kept.map((f) => f.text));
  for (const fen of DANYA) kept.push(...(await readDanyaBoard(fen, D[readKey(fen)] ?? [], fixtureReader(D))).kept.map((f) => f.text));
}, 900_000);

describe('no orphan lead', () => {
  it('reads facts', () => { expect(kept.length).toBeGreaterThan(50); });
  it('no kept fact starts with It / This / That / after this', () => {
    const bad = kept.filter((t) => ORPHAN_LEAD.test(t.trim()));
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
