// Five master puzzles (0Km5u, 0LeQy, 0GvdU, 0CegO, 0IsE8), every solver move
// read as the board read reads it, from recorded engine reads
// (`__fixtures__/puzzles5.reads.json`, built by
// `RECORD_READS=… npx tsx scripts/board-read-stored.ts pz.jsonl out.jsonl`).
// A read the fixture lacks throws, naming its FEN.
import { describe, it, expect, beforeAll } from 'vitest';
import reads from './__fixtures__/puzzles5.reads.json';
import answerKey from './__fixtures__/puzzles5.key.json';
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
/** The same moves read in order WITH a story: each puzzle's ledger carries what its earlier moves said. */
const told: Record<string, string> = {};
/** …and the general lines each said (the verdict and the standing are read fresh every board). */
const toldGeneral: Record<string, string[]> = {};
const all: Array<{ id: string; fen: string }> = [];

beforeAll(async () => {
  const fs = await import('node:fs');
  const rows = fs.readFileSync(`${process.cwd()}/src/services/__fixtures__/puzzles5.boards.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
  for (const r of rows) { all.push(r); got[r.id] = (await readDanyaBoard(r.fen, R[readKey(r.fen)] ?? [], fixtureReader(R))).read; }
  const ledger = new Map<string, string[]>();
  for (const r of rows) {
    const pz = r.id.split('#')[0];
    const d = await readDanyaBoard(r.fen, R[readKey(r.fen)] ?? [], fixtureReader(R), ledger.get(pz) ?? []);
    told[r.id] = d.read;
    toldGeneral[r.id] = d.kept.filter((f) => f.computer !== 'pictureVerdict' && !['standing', 'eval', 'convert', 'compensation', 'verdict'].includes(f.kind)).map((f) => f.text);
    ledger.set(pz, [...(ledger.get(pz) ?? []), ...d.said]);
  }
  if (process.env.P5_DUMP) fs.writeFileSync(`${process.env.P5_DUMP}.told.json`, JSON.stringify(told, null, 1));
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
  it('every read names the engine\'s move (or one within half a pawn)', () => {
    const PIECE: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
    const missing = Object.entries(answerKey as Record<string, string[]>).filter(([id, sans]) => !sans.some((san) => {
      const bare = san.replace(/[+#]$/, '');
      const sq = /([a-h][1-8])(?:=[QRBN])?$/.exec(bare)?.[1] ?? '';
      return got[id].includes(bare) || (PIECE[san[0]] && new RegExp(`${PIECE[san[0]]} to ${sq}`, 'i').test(got[id]));
    })).map(([id]) => id);
    expect(missing).toEqual([]);
  });
  it('0Km5u Kh8: says Rf7 and Be6 fail, and the f-file/f2 plan', () => {
    const t = of('0Km5u#1');
    expect(t).toMatch(/Rf7/); expect(t).toMatch(/Be6/); expect(t).toMatch(/f-file|f2/);
  });
  it('0Km5u Kg8: says Rf8+ and the back rank', () => { const t = of('0Km5u#13'); expect(t).toMatch(/Rf8\+/); expect(t).toMatch(/back rank/i); });
  it('0Km5u Qe3: says the …Be6 threat', () => { expect(of('0Km5u#7')).toMatch(/Be6/); });
  it('0Km5u Rd8: says it stops Qxf8 mate', () => { expect(of('0Km5u#11')).toMatch(/Qxf8|f8[^.]*mate|mate[^.]*f8/); });
  it('0IsE8 Rxf5: says exf5 runs into mate', () => { expect(of('0IsE8#1')).toMatch(/exf5[^.]*mate|mate[^.]*exf5/i); });
  it('0IsE8 Kg6: says it threatens Rf1#', () => { expect(of('0IsE8#5')).toMatch(/Rf1/); });
  it('0GvdU f1=N+: says why the knight', () => { expect(of('0GvdU#7')).toMatch(/knight|f1=Q/i); });
  it('with a story, no general line twice in one puzzle', () => {
    const twice: string[] = [];
    for (const pz of new Set(Object.keys(told).map((k) => k.split('#')[0]))) {
      const seen = new Set<string>();
      for (const [k, ts] of Object.entries(toldGeneral)) {
        if (!k.startsWith(`${pz}#`)) continue;
        for (const sent of ts.join(' ').split(/(?<=[.!?])\s+/).filter((x) => x.length > 30)) {
          if (seen.has(sent)) twice.push(`${pz}: ${sent}`);
          seen.add(sent);
        }
      }
    }
    expect(twice, twice.join('\n')).toEqual([]);
  });
  it('failed tries, and the average words (the longest reported)', () => {
    const stat = (m: Record<string, string>): { avg: number; max: number; tries: number } => {
      const ws = Object.values(m).map(words);
      return { avg: Math.round(ws.reduce((a, b) => a + b, 0) / ws.length), max: Math.max(...ws), tries: Object.values(m).reduce((n, t) => n + tries(t), 0) };
    };
    const alone = stat(got);
    const inOrder = stat(told);
    console.log(`[puzzles5] alone: words avg ${alone.avg} max ${alone.max} tries ${alone.tries} | in order with a story: avg ${inOrder.avg} max ${inOrder.max} tries ${inOrder.tries}`);
    // THE TARGETS (David 2026-11-20), on the puzzle read move by move with its
    // story — the way a solver hears it.
    // The words are an AVERAGE, never a cap (G4.5, the WHY standard's turn
    // length): every job of the board's move speaks, and the longest read is
    // reported, not held (David 2026-11-20: the 250 ceiling is a measure).
    expect(inOrder.tries).toBeLessThanOrEqual(25);
    expect(inOrder.avg).toBeLessThanOrEqual(120);
  });
});
