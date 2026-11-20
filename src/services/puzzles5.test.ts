// Five master puzzles (0Km5u, 0LeQy, 0GvdU, 0CegO, 0IsE8), every solver move
// read as the board read reads it, from recorded engine reads
// (`__fixtures__/puzzles5.reads.json`, built by
// `RECORD_READS=… npx tsx scripts/board-read-stored.ts pz.jsonl out.jsonl`).
// A read the fixture lacks throws, naming its FEN.
import { describe, it, expect, beforeAll } from 'vitest';
import reads from './__fixtures__/puzzles5.reads.json';
import { fixtureReader, readDanyaBoard, readKey, type Reads } from '../test/danyaBoardRead';

const BOARDS: Record<string, string> = {
  '0Km5u#1-Kh8': '1rb2rk1/6pp/1qNp4/1p1Qppb1/4P3/2P5/1P3PPP/R3KB1R b KQ - 3 18',
  '0Km5u#3-fxe4': '1Nb2r1k/6pp/1q1p4/1p1Qppb1/4P3/2P5/1P3PPP/R3KB1R b KQ - 0 19',
  '0Km5u#5-Qxf2+': '1Nb2r1k/6pp/1q1p4/1p1Qp1b1/4p3/2P5/1P2BPPP/R3K2R b KQ - 1 20',
  '0Km5u#7-Qe3': '1Nb2r1k/6pp/3p4/1p1Qp1b1/4p3/2P5/1P2BqPP/R2K3R b - - 1 21',
  '0Km5u#9-Bxd7': '2b2r1k/3N2pp/3p4/1p1Qp1b1/4p3/2P1q3/1P2B1PP/R2K3R b - - 3 22',
  '0Km5u#11-Rd8': '5r1k/3b2pp/3Q4/1p2p1b1/4p3/2P1q3/1P2B1PP/R2K3R b - - 0 23',
};
const R = reads as unknown as Reads;
const got: Record<string, string> = {};
const all: Array<{ id: string; fen: string }> = [];

beforeAll(async () => {
  const fs = await import('node:fs');
  const rows = fs.readFileSync(`${process.cwd()}/src/services/__fixtures__/puzzles5.boards.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
  for (const r of rows) { all.push(r); got[r.id] = (await readDanyaBoard(r.fen, R[readKey(r.fen)] ?? [], fixtureReader(R))).read; }
  if (process.env.P5_DUMP) fs.writeFileSync(process.env.P5_DUMP, JSON.stringify(got, null, 1));
}, 600_000);

const words = (t: string): number => t.split(/\s+/).filter(Boolean).length;
const tries = (t: string): number => (t.match(/(looks natural|is the obvious try|is tempting|all fail to|\? Then )/g) ?? []).length;
const of = (prefix: string): string => Object.entries(got).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v)[0] ?? '';

describe('five master puzzles, read move by move', () => {
  it('reads every board', () => { expect(Object.keys(BOARDS).every((k) => k in got)).toBe(true); expect(all.length).toBe(29); });
  it('says none of the garbled lines', () => {
    const t = Object.values(got).join('\n');
    expect(t).not.toMatch(/and (?:\w+) more moves, /);
    expect(t).not.toMatch(/escapes the checks with [a-h]?[BNRQ]/);
  });
  it('0Km5u Qe3: says the …Be6 threat', () => { expect(of('0Km5u#7')).toMatch(/Be6/); });
  it('0Km5u Rd8: says it stops Qxf8 mate', () => { expect(of('0Km5u#11')).toMatch(/Qxf8|f8[^.]*mate|mate[^.]*f8/); });
  it('0IsE8 Rxf5: says exf5 runs into mate', () => { expect(of('0IsE8#1')).toMatch(/exf5[^.]*mate|mate[^.]*exf5/i); });
  it('0IsE8 Kg6: says it threatens Rf1#', () => { expect(of('0IsE8#5')).toMatch(/Rf1/); });
  it('0GvdU f1=N+: says why the knight', () => { expect(of('0GvdU#7')).toMatch(/knight|f1=Q/i); });
  it('ceilings: failed tries, words', () => {
    const ws = Object.values(got).map(words);
    const total = Object.values(got).reduce((n, t) => n + tries(t), 0);
    console.log(`[puzzles5] words avg ${Math.round(ws.reduce((a, b) => a + b, 0) / ws.length)} max ${Math.max(...ws)} tries ${total}`);
    // CEILINGS AT TODAY'S COUNTS — they only fall. Target: tries ≤ 25, no read
    // over 250 words (OWED: the 'threat' tries on 0Km5u …Qe3).
    expect(total).toBeLessThanOrEqual(40);
    expect(Math.max(...ws)).toBeLessThanOrEqual(681);
  });
});
