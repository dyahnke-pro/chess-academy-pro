/**
 * MOMENT 3, MEASURED: how often a sound engine line from a real board sets up
 * a tactic, by motif, with samples to read against the board. Reads the Danya
 * bench's stored engine reads (`scripts/bench/danya-reads.mjs`).
 *
 *   SET_UP_MEASURE=1 npx vitest run src/services/setUpChance.measure.test.ts
 *
 * Writes audit-reports/set-up-chances.json.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { detectSetUpChance, setUpHeldClause } from './setUpChance';
import type { AnalysisLine } from '../types';

const READS = 'audit-reports/.fixtures/danya-bench';
const NOTES = 'public/data/voiced-teachings.json';
const RUN = process.env.SET_UP_MEASURE === '1' && existsSync(READS);

describe.skipIf(!RUN)('moment 3 on real boards', () => {
  it('reports set-ups by motif, with samples', () => {
    const notes = new Map<string, { lineSan: string[] }>((JSON.parse(readFileSync(NOTES, 'utf8')).notes as Array<{ id: string; lineSan: string[] }>).map((n) => [n.id, n]));
    let boards = 0; let found = 0;
    const byMotif: Record<string, number> = {};
    const samples: string[] = [];
    for (const f of readdirSync(READS).filter((x) => /^reads-\d+\.jsonl$/.test(x))) {
      for (const row of readFileSync(`${READS}/${f}`, 'utf8').split('\n')) {
        if (!row) continue;
        let r: { id: string; before?: Array<{ cp: number | null; mate: number | null; pv: string[] }> };
        try { r = JSON.parse(row); } catch { continue; }
        const note = notes.get(r.id);
        if (!note || !r.before || note.lineSan.length < 16) continue;
        const c = new Chess();
        let ok = true;
        for (const san of note.lineSan.slice(0, -1)) { try { c.move(san); } catch { ok = false; break; } }
        if (!ok) continue;
        boards += 1;
        const lines: AnalysisLine[] = r.before.map((l, k) => ({ rank: k + 1, evaluation: l.cp ?? 0, mate: l.mate, moves: l.pv }));
        const s = detectSetUpChance(c.fen(), lines, c.turn());
        if (!s) continue;
        found += 1;
        const key = `${s.kind}:${s.motif}`;
        byMotif[key] = (byMotif[key] ?? 0) + 1;
        if (byMotif[key] <= 3) {
          const san: string[] = []; const d = new Chess(c.fen());
          for (const u of s.line.slice(0, 2 * s.depth)) { try { san.push(d.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
          samples.push(`${key} | ${c.fen()} | ${san.join(' ')} | ${setUpHeldClause(s)}`);
        }
      }
    }
    writeFileSync('audit-reports/set-up-chances.json', `${JSON.stringify({ boards, found, byMotif, samples }, null, 1)}\n`);
    console.log(`boards ${boards} · set-ups ${found} (${(100 * found / Math.max(1, boards)).toFixed(1)}%)`);
    console.log(JSON.stringify(byMotif));
    for (const s of samples) console.log(s);
    expect(boards).toBeGreaterThan(0);
  }, 900_000);
});
