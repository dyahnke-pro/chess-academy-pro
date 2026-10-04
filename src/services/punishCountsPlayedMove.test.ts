import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { proofCut, describeExchange } from './exchangeLedger';

// Clean-pass review walk 2026-10-04, G1 (lichess SI5q0VJz) 41.Qxe5+ — the
// queen on b8 took Black's queen. Review: "Here's how it gets punished from
// here: Kxd7, Qxg7+, Kd6, Qxh8 and Kxd5 — you come out behind on material, a
// rook and a pawn for a rook and a bishop." Over the line alone that count is
// right; over the MOVE it is false — White is a queen up at the end of it.
const BEFORE = '1Q1nk2r/3R2pp/8/3Bq3/8/P6P/5PP1/6K1 w - - 0 41';
const AFTER = '3nk2r/3R2pp/8/3BQ3/8/P6P/5PP1/6K1 b - - 0 41';
const LINE = ['Kxd7', 'Qxg7+', 'Kd6', 'Qxh8', 'Kxd5'];

describe('a punishment is counted from before the move it punishes', () => {
  it('the defect is real: counted from after the move, the line reads as a loss', () => {
    const p = proofCut(AFTER, LINE, 'w');
    expect(p?.ledger?.netPawns ?? 0).toBeLessThan(0);
    expect(describeExchange(p?.ledger ?? null)).toMatch(/behind on material/);
  });
  it('counted from before the move, the student comes out ahead — no punishment to tell', () => {
    const p = proofCut(BEFORE, ['Qxe5+', ...LINE], 'w');
    expect(p?.ledger?.netPawns ?? 0).toBeGreaterThan(0);
  });
  it('the review punish pass tallies its line from the played move', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    const pass = src.slice(src.indexOf('// #3 compose — punishment / advantage lines.'), src.indexOf("mark('punish');"));
    expect(pass).toMatch(/punishedMove\.set\(line, \{ fenBefore: s\.fenBefore, san: s\.san \}\)/);
    expect(src).toMatch(/proofCut\(played\.fenBefore, \[played\.san, \.\.\.sans\], studentColorWB\)/);
  });
});
