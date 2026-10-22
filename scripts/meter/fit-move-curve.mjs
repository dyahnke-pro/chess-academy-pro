#!/usr/bin/env node
// THE MOVE-QUALITY CURVE (2026-10-22, David: the coach "keeps kicking my ass").
// How often a REAL player at each rating makes a mistake (>= 100 cp) and a
// blunder (>= 300 cp) on one move, from the same Lichess engine reads the skill
// table is built from (Stockfish depth 12, white POV). Filter, which the live
// estimator (`liveStrength`) applies identically: the 9th move on (ply index
// >= 16, so book moves weigh little) and a contested board (the mover's eval
// before the move within ±300 cp, not a mate). Each curve is a logistic in
// rating, fitted on log10-odds of a clean move: P(clean | r) = 1 / (1 + 10^(-(r - D) / S)).
//   node scripts/meter/fit-move-curve.mjs [readsDir ...]  → src/data/move-quality-curve.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['/tmp/claude-0/meter/eng', '/tmp/claude-0/meter/eng4'];
export const FIRST_PLY = 16;
export const CONTESTED_CP = 300;
const BARS = { mistake: 100, blunder: 300 };
/** The loss bands a move is read in (cp): [0,20) [20,50) [50,100) [100,200) [200,300) [300+). */
export const BAND_EDGES = [20, 50, 100, 200, 300];
const B = 100;
const buckets = {};
let games = 0;
for (const d of dirs) for (const f of readdirSync(d).filter((x) => x.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(`${d}/${f}`, 'utf8').split('\n')) {
    if (!line) continue;
    const g = JSON.parse(line); games++;
    for (let p = FIRST_PLY; p < g.sans.length; p++) {
      const a = g.reads[p], b = g.reads[p + 1];
      if (!a || !b || a.mate != null || a.cp == null || (b.cp == null && b.mate == null)) continue;
      const white = p % 2 === 0;
      const before = white ? a.cp : -a.cp;
      if (Math.abs(before) > CONTESTED_CP) continue;
      const afterW = b.mate != null ? (b.mate > 0 ? 10000 : -10000) : b.cp;
      const loss = Math.max(0, before - (white ? afterW : -afterW));
      const k = Math.floor((white ? g.w : g.b) / B) * B;
      const c = (buckets[k] ??= { n: 0, mistake: 0, blunder: 0, bands: [0, 0, 0, 0, 0, 0] });
      c.n++; if (loss >= BARS.mistake) c.mistake++; if (loss >= BARS.blunder) c.blunder++;
      c.bands[BAND_EDGES.filter((e) => loss >= e).length]++;
    }
  }
}
/** Weighted least squares of log10-odds(clean) on the bucket's centre. */
function fit(kind) { return fitShare((c) => c[kind] / c.n); }
function fitShare(share) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [k, c] of Object.entries(buckets)) {
    const p = 1 - share(c);
    if (p <= 0 || p >= 1 || c.n < 500) continue;
    const x = Number(k) + B / 2, y = Math.log10(p / (1 - p)), w = c.n * p * (1 - p);
    sw += w; sx += w * x; sy += w * y; sxx += w * x * x; sxy += w * x * y;
  }
  const slope = (sw * sxy - sx * sy) / (sw * sxx - sx * sx);
  const icpt = (sy - slope * sx) / sw;
  return { D: Math.round(-icpt / slope), S: Math.round(1 / slope) };
}
const out = {
  _source: 'Lichess open database 2024-06 (rated blitz/rapid/classical with [%eval], 600-2600 evenly), Stockfish depth-12 reads; scripts/meter/fit-move-curve.mjs',
  _filter: `ply index >= ${FIRST_PLY}; the mover's eval before within ±${CONTESTED_CP} cp, not a mate; a mistake costs >= ${BARS.mistake} cp, a blunder >= ${BARS.blunder} cp`,
  games,
  firstPly: FIRST_PLY,
  contestedCp: CONTESTED_CP,
  bars: BARS,
  curves: { mistake: fit('mistake'), blunder: fit('blunder') },
  bandEdges: BAND_EDGES,
  // THE LIVE ESTIMATOR'S LIKELIHOOD: for each band edge, P(a move costs at
  // least that | rating) as a smooth logistic in rating — the raw buckets are
  // noisy and not monotone (an 1850's moves read like a 1550's), so a band
  // read straight off them cannot tell neighbouring ratings apart. A band's
  // probability is the difference of its two edges' curves.
  atLeast: BAND_EDGES.map((edge, i) => ({ edge, ...fitShare((c) => c.bands.slice(i + 1).reduce((a, x) => a + x, 0) / c.n) })),
  buckets: Object.fromEntries(Object.entries(buckets).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, c]) => [k, { n: c.n, mistake: +(c.mistake / c.n).toFixed(4), blunder: +(c.blunder / c.n).toFixed(4) }])),
};
writeFileSync('src/data/move-quality-curve.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ games, curves: out.curves, atLeast: out.atLeast }));
// Each band read from the smooth curves against the bucket's own share.
const bandsAt = (r) => { const ge = out.atLeast.map(({ D, S }) => 1 - 1 / (1 + Math.pow(10, -(r - D) / S))); return [1 - ge[0], ...ge.map((g, i) => g - (ge[i + 1] ?? 0))]; };
for (const [k, c] of Object.entries(buckets).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  if (c.n < 500) continue;
  const m = bandsAt(Number(k) + B / 2);
  console.log(`${k}\tbands ${c.bands.map((x) => (100 * x / c.n).toFixed(1)).join(' ')}\tfit ${m.map((x) => (100 * x).toFixed(1)).join(' ')}`);
}
for (const [k, c] of Object.entries(out.buckets)) {
  const e = (kind) => 1 - 1 / (1 + Math.pow(10, -((Number(k) + 50) - out.curves[kind].D) / out.curves[kind].S));
  console.log(`${k}\tn=${c.n}\tmistake ${(100 * c.mistake).toFixed(1)}% (fit ${(100 * e('mistake')).toFixed(1)}%)\tblunder ${(100 * c.blunder).toFixed(1)}% (fit ${(100 * e('blunder')).toFixed(1)}%)`);
}
