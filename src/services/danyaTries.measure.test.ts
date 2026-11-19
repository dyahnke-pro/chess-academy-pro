/**
 * THE TRIES BENCH (WO-PICTURE-01 fix 9, David 2026-11-19): Danya's 240
 * refuted tries — the move he weighed and ruled out (?, ?!, ??, !?) on boards
 * from his own annotated games — read by the two refuters on the engine reads
 * stored with them (depth 14, MultiPV 3 plus the try's own line), so the bench
 * runs without an engine and never drifts.
 *
 * The number that only rises: how many of his tries we say. Each one we do not
 * names the gate that dropped it (`StandingGate`), which is the work list.
 * Run: `DANYA_TRIES=1 npx vitest run src/services/danyaTries.measure.test.ts`
 * (~2 min); `DANYA_TRIES_REPORT=1` also writes every try's line to
 * audit-reports/danya-tries.json.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { Chess, type Color } from 'chess.js';
import { temptingOnBoard, standingRefutations, type WeighRead, type StandingGate } from './weighedMoves';
import tries from './__fixtures__/danyaTries.reads.json';

interface TryRow { id: string; fen: string; try: string; nag: string; his: string | null; reads: WeighRead[] }

/** Said today; it only rises. */
const SAID_FLOOR = 63;

describe.skipIf(process.env.DANYA_TRIES !== '1')('the tries bench: his refuted tries, said', () => {
  it('says at least the floor, and names the gate on every one it drops', () => {
    const gates: Record<string, number> = {};
    const rows: Array<{ id: string; try: string; nag: string; gate: string; said: string | null }> = [];
    for (const t of tries as TryRow[]) {
      const m = new Chess(t.fen).move(t.try);
      const uci = m.from + m.to + (m.promotion ?? '');
      const student = t.fen.split(' ')[1] as Color;
      let gate: StandingGate | 'not-weighed' = 'not-weighed';
      const tempt = temptingOnBoard({ fen: t.fen, student, rating: 1800, reads: t.reads, priorMove: null }).find((x) => x.uci === uci);
      const stand = standingRefutations({ fen: t.fen, student, rating: 1800, reads: t.reads, onDrop: (u, g) => { if (u === uci) gate = g; } }).find((x) => x.uci === uci);
      const said = tempt?.text ?? stand?.text ?? null;
      const g = said ? 'said' : gate;
      gates[g] = (gates[g] ?? 0) + 1;
      rows.push({ id: t.id, try: t.try, nag: t.nag, gate: g, said });
    }
    if (process.env.DANYA_TRIES_REPORT === '1') {
      fs.mkdirSync('audit-reports', { recursive: true });
      fs.writeFileSync('audit-reports/danya-tries.json', JSON.stringify({ gates, rows }, null, 1));
    }
    console.log('[danya-tries]', JSON.stringify(gates));
    expect(gates.said ?? 0).toBeGreaterThanOrEqual(SAID_FLOOR);
  }, 600_000);
});
