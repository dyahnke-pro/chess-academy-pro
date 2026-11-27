// THE STANDING'S WHY, MEASURED ON DANYA'S BOARDS — how often the verdict on a
// board he talked over goes out with a reason the board can back, by band.
// Before the evidence round (2026-11-26): no reason on 84% of level boards,
// 29% of slight or clear edges, 15% of decisive ones.
//
//   node scripts/bench/danya-reads.mjs <dir> <i/n> 12 <notes.json>   (reads)
//   STANDING_MEASURE=1 STANDING_READS=<dir> STANDING_NOTES=<notes.json> \
//     npx vitest run src/services/standingWhy.measure.test.ts
//
// Writes audit-reports/standing-why.json: the share per band, each kind's
// count, and a sample of the lines said and the boards left bare.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { verdictWithReasons, type ReasonKind } from './verdictWithReasons';
import { evalBand, type EvalBand } from './evalBand';

const RUN = process.env.STANDING_MEASURE === '1';
const READS = process.env.STANDING_READS ?? 'audit-reports/.fixtures/danya-bench';
const NOTES = process.env.STANDING_NOTES ?? 'public/data/voiced-teachings.json';

interface Line { uci: string; cp: number | null; mate: number | null; pv: string[] }
interface Note { id: string; lineSan: string[]; studentSide: 'white' | 'black' }

describe.runIf(RUN)('the standing carries its why on Danya boards', () => {
  it('measures the share of boards whose standing has a reason, by band', () => {
    const notes = new Map<string, Note>((JSON.parse(readFileSync(NOTES, 'utf8')) as { notes: Note[] }).notes.map((n) => [n.id, n]));
    const reads = new Map<string, Line[]>();
    for (const f of readdirSync(READS).filter((x) => x.startsWith('reads-'))) {
      for (const l of readFileSync(`${READS}/${f}`, 'utf8').split('\n').filter(Boolean)) {
        const r = JSON.parse(l) as { id: string; after?: Line[] };
        if (r.after?.length) reads.set(r.id, r.after);
      }
    }
    const byBand: Record<EvalBand, { n: number; reasoned: number }> = {
      level: { n: 0, reasoned: 0 }, slightly: { n: 0, reasoned: 0 }, clearly: { n: 0, reasoned: 0 }, decisive: { n: 0, reasoned: 0 },
    };
    const kinds: Partial<Record<ReasonKind, number>> = {};
    const said: string[] = []; const bare: string[] = [];
    for (const [id, after] of reads) {
      const note = notes.get(id);
      if (!note || after[0].mate != null || after[0].cp == null) continue;
      const c = new Chess();
      let last: { to: string; captured: string | null } | null = null;
      try { for (const s of note.lineSan) { const m = c.move(s); last = { to: m.to, captured: m.captured ?? null }; } } catch { continue; }
      const student = note.studentSide === 'white' ? 'w' : 'b';
      const band = evalBand(after[0].cp);
      const v = verdictWithReasons({ fen: c.fen(), evalCp: after[0].cp, mate: null, lines: after.map((l) => ({ moves: l.pv })), student, lastMove: last, said: new Set() });
      byBand[band].n += 1;
      if (v) {
        byBand[band].reasoned += 1;
        for (const r of v.reasons) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
        if (said.length < 60 && byBand[band].reasoned % 7 === 0) said.push(`${band} ${after[0].cp} ${c.fen()} :: ${v.text}`);
      } else if (bare.length < 60 && byBand[band].n % 5 === 0) bare.push(`${band} ${after[0].cp} ${c.fen()}`);
    }
    const share = Object.fromEntries(Object.entries(byBand).map(([b, x]) => [b, { ...x, bare: x.n ? Math.round((100 * (x.n - x.reasoned)) / x.n) : null }]));
    if (!existsSync('audit-reports')) mkdirSync('audit-reports');
    writeFileSync('audit-reports/standing-why.json', JSON.stringify({ share, kinds, said, bare }, null, 2));
    console.log(JSON.stringify({ share, kinds }, null, 2));
    expect(reads.size).toBeGreaterThan(100);
  }, 600_000);
});
