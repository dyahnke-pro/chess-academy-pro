// WO-DEPTH-01 step 3 — the deep reads at David's slips against a MATCHED
// ordinary move (same game, same seat). A read is a reason only where it is
// more common at slips than at the matched moves (the lift).
//   node scripts/depth/slip-reads.mjs <drop> audit-reports/slip-reads <i/n>   (engine, sharded)
//   SLIP_DEPTH_MEASURE=1 npx vitest run src/services/slipDepth.measure.test.ts
// Writes audit-reports/slip-depth.json.
import { it } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { slipDepth, type EngineLine } from './slipDepth';

const RUN = process.env.SLIP_DEPTH_MEASURE === '1';
const DIR = 'audit-reports/slip-reads';

interface Row { game: string; ply: number; seat: string; kind: string; san: string; fen: string; lines: EngineLine[]; after?: EngineLine | null }

it.runIf(RUN && existsSync(DIR))('deep reads: slips against matched ordinary moves', () => {
  const rows: Row[] = readdirSync(DIR).filter((f) => f.startsWith('slips-')).flatMap((f) =>
    readFileSync(`${DIR}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row));
  const groups: Record<string, { n: number; holds: number[]; one: number; two: number; narrow: number; bestQuiet: number; bait: Record<string, number>; ref: number; refMoves: number[]; refQuiet: number; refMate: number }> = {};
  const samples: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const g = (groups[r.kind === 'ordinary' ? 'ordinary' : 'slip'] ??= { n: 0, holds: [], one: 0, two: 0, narrow: 0, bestQuiet: 0, bait: {}, ref: 0, refMoves: [], refQuiet: 0, refMate: 0 });
    const d = slipDepth(r.fen, r.san, r.lines, r.after ?? null);
    if (!d) continue;
    g.n += 1;
    g.holds.push(d.holds);
    if (d.holds === 1) g.one += 1;
    if (d.holds === 2) g.two += 1;
    if (d.holds <= 3) g.narrow += 1;
    if (d.bestQuiet) g.bestQuiet += 1;
    g.bait[d.bait ?? 'none'] = (g.bait[d.bait ?? 'none'] ?? 0) + 1;
    if (d.refutation) {
      g.ref += 1; g.refMoves.push(d.refutation.moves);
      if (d.refutation.quietStart) g.refQuiet += 1;
      if (d.refutation.mate) g.refMate += 1;
    }
    if (r.kind !== 'ordinary' && samples.length < 40 && (samples.length < 15 || r.ply % 5 === 0)) {
      samples.push({ game: r.game, ply: r.ply + 1, seat: r.seat, san: r.san, fen: r.fen, holds: d.holds, read: d.read, bestQuiet: d.bestQuiet, best: r.lines[0]?.pv[0], bait: d.bait, refutation: d.refutation });
    }
  }
  const pct = (a: number, n: number): number => Math.round((1000 * a) / Math.max(1, n)) / 10;
  const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
  const summary = Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, {
    n: g.n,
    medianHolds: median(g.holds),
    onlyOne: pct(g.one, g.n), onlyTwo: pct(g.two, g.n), threeOrFewer: pct(g.narrow, g.n),
    bestQuiet: pct(g.bestQuiet, g.n),
    bait: Object.fromEntries(Object.entries(g.bait).map(([b, c]) => [b, pct(c, g.n)])),
    refuted: pct(g.ref, g.n), medianRefMoves: median(g.refMoves), refQuietStart: pct(g.refQuiet, g.ref), refMate: pct(g.refMate, g.ref),
    refMovesHist: g.refMoves.reduce<Record<number, number>>((h, m) => { h[m] = (h[m] ?? 0) + 1; return h; }, {}),
  }]));
  writeFileSync('audit-reports/slip-depth.json', JSON.stringify({ rows: rows.length, summary, samples }, null, 1));
  console.log('SLIP_DEPTH', JSON.stringify(summary));
}, 600_000);
