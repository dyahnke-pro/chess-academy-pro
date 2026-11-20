// RENDER_DUMP=<dir>: every fact computed and kept on the 29 puzzle boards (alone
// and in order with their story) and the 5 Danya boards — the input of the
// fact diff (`scripts/voice/fact-diff.mjs`). Not a gate: it only writes.
import { it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import p5 from '../services/__fixtures__/puzzles5.reads.json';
import d5 from '../services/__fixtures__/danyaBoards5.reads.json';
import { fixtureReader, readDanyaBoard, readKey, type Reads } from './danyaBoardRead';

const DIR = process.env.RENDER_DUMP;
const DANYA: Record<string, string> = {
  underpromotion: '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1',
  gun: 'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20',
  opera: '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17',
  blunder: '4k3/7p/4PN2/p7/P6K/7P/1p4P1/8 b - - 0 48',
  desperado: 'rnq2rk1/1pn3bp/p2p2p1/2pPp1PP/P1P1Pp2/2N2N2/1P1B1P2/R2QK2R b KQ - 0 16',
};

it.runIf(!!DIR)('dumps the facts of every board', async () => {
  mkdirSync(DIR as string, { recursive: true });
  const out: Record<string, unknown> = {};
  const P = p5 as unknown as Reads; const D = d5 as unknown as Reads;
  const rows = readFileSync(`${process.cwd()}/src/services/__fixtures__/puzzles5.boards.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
  const ledger = new Map<string, string[]>();
  for (const r of rows) {
    out[`alone:${r.id}`] = await readDanyaBoard(r.fen, P[readKey(r.fen)] ?? [], fixtureReader(P));
    const pz = r.id.split('#')[0];
    const d = await readDanyaBoard(r.fen, P[readKey(r.fen)] ?? [], fixtureReader(P), ledger.get(pz) ?? []);
    out[`told:${r.id}`] = d;
    ledger.set(pz, [...(ledger.get(pz) ?? []), ...d.said]);
  }
  for (const [n, fen] of Object.entries(DANYA)) out[`danya:${n}`] = await readDanyaBoard(fen, D[readKey(fen)] ?? [], fixtureReader(D));
  writeFileSync(`${DIR}/facts.json`, JSON.stringify(out, null, 1));
}, 900_000);
