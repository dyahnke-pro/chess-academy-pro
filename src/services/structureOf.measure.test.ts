// MEASURE (STRUCTURE_MEASURE=1): on Danya's voiced notes with plan text, how
// often the structure computers name a square his plan names — before
// (`structurePlanFact`, both sides) and after (`structureOf` beside it).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess, type Color } from 'chess.js';
import { structureOf } from './structureOf';
import { structurePlanFact } from './nextPlans';

const RUN = process.env.STRUCTURE_MEASURE === '1';
describe.skipIf(!RUN)('structureOf on Danya\'s plan notes', () => {
  it('names his plan\'s squares more often than before', () => {
    const d = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as { notes?: unknown[] } & Record<string, unknown>;
    const notes = (Object.values(d).find(Array.isArray) ?? []) as Array<{ lineSan: string[]; plans: string; positionKey: string }>;
    let posed = 0; let before = 0; let after = 0; const byKind: Record<string, number> = {};
    for (const n of notes) {
      if (!n.plans || !n.lineSan?.length) continue;
      const squares = new Set(n.plans.match(/\b[a-h][1-8]\b/g) ?? []);
      if (!squares.size) continue;
      let fen: string;
      try { const c = new Chess(); for (const m of n.lineSan) c.move(m); fen = c.fen(); } catch { continue; }
      posed += 1;
      const old = new Set<string>();
      for (const side of ['w', 'b'] as Color[]) for (const s of structurePlanFact(fen, side)?.squares ?? []) old.add(s);
      const now = new Set(old);
      const kinds: string[] = [];
      for (const side of ['w', 'b'] as Color[]) for (const p of structureOf(fen, side)) { for (const s of p.squares) now.add(s); kinds.push(p.kind); }
      const hit = (set: Set<string>): boolean => [...squares].some((s) => set.has(s));
      if (hit(old)) before += 1;
      if (hit(now)) { after += 1; if (!hit(old)) for (const k of kinds) byKind[k] = (byKind[k] ?? 0) + 1; }
    }
    console.log(`STRUCTURE MEASURE posed=${posed} before=${before} (${(100 * before / posed).toFixed(1)}%) after=${after} (${(100 * after / posed).toFixed(1)}%) new-hits-by-kind=${JSON.stringify(byKind)}`);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
