// THE STANDING REPEATS ONLY ON A CHANGE (CLAUDE.md, David 2026-11-20): once
// said in a game, the standing is said again only when its band changes —
// read in order with the story's ledger, on the recorded puzzle reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import reads from './__fixtures__/puzzles5.reads.json';
import { fixtureReader, readDanyaBoard, readKey, type Reads } from '../test/danyaBoardRead';

const R = reads as unknown as Reads;
const rows = readFileSync('src/services/__fixtures__/puzzles5.boards.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
const fenOf = (id: string): string => { const r = rows.find((x) => x.id === id); if (!r) throw new Error(id); return r.fen; };
const read = (id: string, said: readonly string[] = []) => readDanyaBoard(fenOf(id), R[readKey(fenOf(id))] ?? [], fixtureReader(R), said);

describe('the standing is said again only when its band changes', () => {
  it('the same band three turns later is silent (0LeQy, winning throughout)', async () => {
    const first = await read('0LeQy#1-Rxh6+');
    expect(first.read).toMatch(/You're winning/);
    expect(first.said.some((c) => c.startsWith('standing:'))).toBe(true);
    const later = await read('0LeQy#7-Qxh6', first.said);
    expect(later.read).not.toMatch(/You're winning/);
    // NEGATIVE CONTROL: read fresh, the same board says it.
    expect((await read('0LeQy#7-Qxh6')).read).toMatch(/You're winning/);
  }, 120_000);
  it('a band change is spoken (0Km5u: slightly better, then clearly better)', async () => {
    const first = await read('0Km5u#1-Kh8');
    expect(first.read).toMatch(/You're slightly better/);
    const next = await read('0Km5u#3-fxe4', first.said);
    expect(next.read).toMatch(/You're clearly better/);
  }, 120_000);
});
