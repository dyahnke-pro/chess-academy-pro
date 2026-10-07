import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { BOARD_COMPUTERS, readBoard, readBoardAll, newPlanThread, type ComputerId } from './boardComputers';
import { isProof } from './proof';

const SRC = resolve(__dirname, '..');
const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('boardComputers — the one registry', () => {
  it('every "wired" surface names a file that really calls the computer', () => {
    const bad: string[] = [];
    for (const [id, spec] of Object.entries(BOARD_COMPUTERS) as [ComputerId, { surfaces: Record<string, { wired?: string; not?: string }> }][]) {
      for (const [surface, ans] of Object.entries(spec.surfaces)) {
        if (!ans.wired) { if (!ans.not?.trim()) bad.push(`${id}/${surface}: no reason`); continue; }
        const code = readFileSync(resolve(SRC, ans.wired), 'utf8');
        // Learn reaches it through the registry, by id; another surface may still
        // call the computer's own function (owed onto the registry, P4).
        const viaRegistry = new RegExp(`readBoard(All)?\\('${id}'`).test(code);
        const fnByComputer: Partial<Record<ComputerId, RegExp>> = {
          prophylaxis: /findProphylaxis\(/, tiedDefender: /newTiedDefender\(/, trapped: /trappedOnBoard\(/,
        };
        if (!viaRegistry && !(fnByComputer[id]?.test(code))) bad.push(`${id}/${surface}: ${ans.wired} never calls it`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('a real position comes out of each computer, with its proof', () => {
    const fen = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']);
    const ph = readBoard('prophylaxis', { fen, engineFirstMoves: ['h2h3'] });
    expect(ph?.text).toMatch(/^h3 first/);
    expect(isProof(ph!.proof)).toBe(true);
    // …and silent when the engine does not agree.
    expect(readBoard('prophylaxis', { fen, engineFirstMoves: ['f1e2'] })).toBeNull();

    const order = readBoard('moveOrder', { fen: '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1', pv: ['e2e3', 'h7h6', 'f1d3'] });
    expect(order?.play).toEqual({ from: 'e2', to: 'e3' });

    const tie = readBoard('tiedDefender', { fenBefore: '4k3/3n4/8/4p3/8/8/8/R5NK w - - 0 1', fenAfterMove: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', fenAfterReply: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', student: 'w' });
    expect(tie?.key).toBe('tied:d7>e5');

    const grab = readBoard('queenGrabTrap', { fen: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17' });
    expect(grab && isProof(grab.proof)).toBe(true);
  });

  it('the plan thread carries its proof (the stop is proven off their move)', () => {
    const thread = newPlanThread();
    const reads = readBoardAll('planThread', { thread, ply: 20, fenBefore: after(['e4', 'e5']), fenAfter: after(['e4', 'e5', 'Nf3']), student: 'b' });
    for (const r of reads) expect(r.proof).toBeDefined();
  });
});
