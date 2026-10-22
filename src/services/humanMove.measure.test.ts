// FIT AND MEASURE THE HUMAN MOVE MODEL (David 2026-10-22: "make more human").
//
// Off unless HUMAN_FIT=1 — it reads the all-moves reads, which live outside
// the repo:
//
//   node scripts/meter/all-moves-reads.mjs <games.jsonl> <dir> i/n   (per shard)
//   HUMAN_FIT=1 HUMAN_READS=<dir> [HUMAN_ENGINE_PICKS=<file>] [HUMAN_FIT_WRITE=1] \
//     npx vitest run src/services/humanMove.measure.test.ts
//
// Fits P(move) ∝ exp(w(rating)·features) five times, each on four games in
// five (by a hash of the game id), scores every position with the fit that
// never saw its game, and measures per rating band:
//   - how likely the model found the move the player really chose,
//   - how often its single most likely move was that move,
//   - the share of moves it plays in each cost band, against the players'.
// The same numbers for the engine's top move, and — when HUMAN_ENGINE_PICKS is
// given (`scripts/meter/engine-elo-picks.mjs`) — for Stockfish capped to the
// player's rating, so "more human" is a number, not a claim.
// Writes audit-reports/human-move-fit.json; HUMAN_FIT_WRITE=1 also writes the
// model to src/data/human-move-model.json.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { HUMAN_FEATURES, featureRows, type HumanMoveModel } from './humanMove';

const RUN = process.env.HUMAN_FIT === '1';
const DIR = process.env.HUMAN_READS ?? '';
const ENGINE_PICKS = process.env.HUMAN_ENGINE_PICKS ?? '';
const CENTRE = 1500;
const SCALE = 500;
const BAND_EDGES = [20, 50, 100, 200, 300];
const BUCKETS: Array<[string, number, number]> = [['<1000', 0, 1000], ['1000-1199', 1000, 1200], ['1200-1399', 1200, 1400], ['1400-1799', 1400, 1800], ['1800-2199', 1800, 2200], ['2200+', 2200, 9999]];

interface Pos { id: string; r: number; fen: string; played: string; rows: Array<{ uci: string; cp: number; x: number[] }>; y: number }

function hash(s: string): number {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const band = (cpLoss: number): number => BAND_EDGES.filter((e) => cpLoss >= e).length;
const bucketOf = (r: number): string => BUCKETS.find(([, lo, hi]) => r >= lo && r < hi)?.[0] ?? '2200+';

function load(): Pos[] {
  const out: Pos[] = [];
  for (const f of readdirSync(DIR).filter((n) => /^moves-\d+\.jsonl$/.test(n))) {
    for (const line of readFileSync(join(DIR, f), 'utf8').split('\n')) {
      if (!line) continue;
      const o = JSON.parse(line) as { id: string; r: number; fen: string; played: string; cands: Array<[string, number]> };
      const rows = featureRows(o.fen, o.cands.map(([uci, cp]) => ({ uci, cp })));
      const y = rows.findIndex((row) => row.uci === o.played);
      if (y < 0 || rows.length < 2) continue;
      out.push({ id: o.id, r: o.r, fen: o.fen, played: o.played, rows, y });
    }
  }
  return out;
}

function logits(p: Pos, base: number[], slope: number[], curve: number[], rating: number = p.r): number[] {
  const z = (rating - CENTRE) / SCALE;
  return p.rows.map((row) => row.x.reduce((a, v, k) => a + v * (base[k] + slope[k] * z + curve[k] * z * z), 0));
}
function softmax(l: number[]): number[] {
  const top = Math.max(...l);
  const e = l.map((v) => Math.exp(v - top));
  const s = e.reduce((a, v) => a + v, 0);
  return e.map((v) => v / s);
}

function fit(train: Pos[]): { base: number[]; slope: number[]; curve: number[] } {
  const F = HUMAN_FEATURES.length;
  const theta = new Array<number>(3 * F).fill(0);
  const m = new Array<number>(3 * F).fill(0);
  const v = new Array<number>(3 * F).fill(0);
  const lr = 0.05; const b1 = 0.9; const b2 = 0.999; const l2 = 1e-4;
  for (let epoch = 1; epoch <= 500; epoch++) {
    const g = new Array<number>(3 * F).fill(0);
    const base = theta.slice(0, F); const slope = theta.slice(F, 2 * F); const curve = theta.slice(2 * F);
    for (const p of train) {
      const z = (p.r - CENTRE) / SCALE;
      const pr = softmax(logits(p, base, slope, curve));
      for (let k = 0; k < F; k++) {
        let expect = 0;
        for (let j = 0; j < p.rows.length; j++) expect += pr[j] * p.rows[j].x[k];
        const d = p.rows[p.y].x[k] - expect;
        g[k] += d; g[F + k] += d * z; g[2 * F + k] += d * z * z;
      }
    }
    for (let k = 0; k < 3 * F; k++) {
      const grad = g[k] / train.length - l2 * theta[k];
      m[k] = b1 * m[k] + (1 - b1) * grad;
      v[k] = b2 * v[k] + (1 - b2) * grad * grad;
      theta[k] += lr * (m[k] / (1 - b1 ** epoch)) / (Math.sqrt(v[k] / (1 - b2 ** epoch)) + 1e-8);
    }
  }
  return { base: theta.slice(0, F), slope: theta.slice(F, 2 * F), curve: theta.slice(2 * F) };
}

describe.runIf(RUN)('the human move model, fitted on real players and measured on held-out games', () => {
  it('fits, measures, and reports', () => {
    expect(existsSync(DIR)).toBe(true);
    const all = load();
    // FIVE FOLDS: every position is scored by a model that never saw its
    // game (one fifth is too small a sample per rating band — a fifth of
    // 1000–1399 players erred at 21% where the other four fifths erred at 26%).
    const params = new Map<Pos, { base: number[]; slope: number[]; curve: number[] }>();
    for (let fold = 0; fold < 5; fold++) {
      const fitted = fit(all.filter((p) => hash(p.id) % 5 !== fold));
      for (const p of all) if (hash(p.id) % 5 === fold) params.set(p, fitted);
    }
    const { base, slope, curve } = fit(all);
    const lo = Math.min(...all.map((p) => p.r)); const hi = Math.max(...all.map((p) => p.r));
    // THE CALIBRATION: a likelihood fit can still err a little more or less
    // often than the players do. One rating SHIFT, fitted on the held-out
    // predictions, so that at every rating band the model's 100-cp and 300-cp
    // rates land on the players' (weighted by positions).
    const rateAt = (shift: number): Array<{ name: string; n: number; d100: number; d300: number }> => BUCKETS.map(([name]) => {
      const ps = all.filter((p) => bucketOf(p.r) === name);
      let m100 = 0; let m300 = 0; let h100 = 0; let h300 = 0;
      for (const p of ps) {
        const w = params.get(p) as { base: number[]; slope: number[]; curve: number[] };
        const r = Math.min(hi, Math.max(lo, p.r + shift));
        const pr = softmax(logits(p, w.base, w.slope, w.curve, r));
        const bestCp = Math.max(...p.rows.map((row) => row.cp));
        p.rows.forEach((row, j) => { const bd = band(bestCp - row.cp); if (bd >= 3) m100 += pr[j]; if (bd >= 5) m300 += pr[j]; });
        const hb = band(bestCp - p.rows[p.y].cp);
        if (hb >= 3) h100 += 1; if (hb >= 5) h300 += 1;
      }
      return { name, n: ps.length, d100: (100 * (m100 - h100)) / Math.max(1, ps.length), d300: (100 * (m300 - h300)) / Math.max(1, ps.length) };
    });
    let shift = 0; let bestErr = Infinity;
    for (let d = -300; d <= 600; d += 25) {
      const err = rateAt(d).reduce((a, b2) => a + b2.n * (b2.d100 ** 2 + b2.d300 ** 2), 0);
      if (err < bestErr) { bestErr = err; shift = d; }
    }
    const engineElo = new Map<string, string>();
    if (ENGINE_PICKS && existsSync(ENGINE_PICKS)) {
      for (const line of readFileSync(ENGINE_PICKS, 'utf8').split('\n')) {
        if (!line) continue;
        const o = JSON.parse(line) as { fen: string; pick: string };
        engineElo.set(o.fen, o.pick);
      }
    }
    const report: Record<string, unknown> = { positions: all.length, folds: 5, shift, buckets: {} };
    // THE BAR: at every rating the model's mistakes come at the players' rate —
    // a 100-cp mistake within 4 points, a 300-cp blunder within 3.
    const misses: string[] = [];
    for (const [name] of BUCKETS) {
      const ps = all.filter((p) => bucketOf(p.r) === name);
      if (ps.length === 0) continue;
      let nll = 0; let pHuman = 0; let modelTop = 0; let engineTop = 0;
      let eloMatch = 0; let eloN = 0;
      const humanBands = new Array<number>(6).fill(0);
      const modelBands = new Array<number>(6).fill(0);
      const eloBands = new Array<number>(6).fill(0);
      for (const p of ps) {
        const w = params.get(p) as { base: number[]; slope: number[]; curve: number[] };
        const pr = softmax(logits(p, w.base, w.slope, w.curve, Math.min(hi, Math.max(lo, p.r + shift))));
        nll -= Math.log(Math.max(1e-12, pr[p.y]));
        pHuman += pr[p.y];
        const arg = pr.indexOf(Math.max(...pr));
        if (arg === p.y) modelTop += 1;
        const bestCp = Math.max(...p.rows.map((r) => r.cp));
        if (p.rows[p.y].cp === bestCp) engineTop += 1;
        humanBands[band(bestCp - p.rows[p.y].cp)] += 1;
        p.rows.forEach((r, j) => { modelBands[band(bestCp - r.cp)] += pr[j]; });
        const ep = engineElo.get(p.fen);
        if (ep) {
          eloN += 1;
          if (ep === p.played) eloMatch += 1;
          const row = p.rows.find((r) => r.uci === ep);
          if (row) eloBands[band(bestCp - row.cp)] += 1;
        }
      }
      const pct = (x: number, n: number): number => Math.round((1000 * x) / n) / 10;
      const at = (bands: number[], from: number): number => bands.slice(from).reduce((a2, x) => a2 + x, 0) / ps.length * 100;
      const d100 = at(modelBands, 3) - at(humanBands, 3);
      const d300 = at(modelBands, 5) - at(humanBands, 5);
      if (Math.abs(d100) > 4) misses.push(`${name}: 100-cp mistakes off by ${d100.toFixed(1)} points`);
      if (Math.abs(d300) > 3) misses.push(`${name}: 300-cp blunders off by ${d300.toFixed(1)} points`);
      (report.buckets as Record<string, unknown>)[name] = {
        positions: ps.length,
        meanNll: Math.round((1000 * nll) / ps.length) / 1000,
        modelChanceOfHumanMovePct: pct(pHuman, ps.length),
        modelTopMatchesHumanPct: pct(modelTop, ps.length),
        engineBestMatchesHumanPct: pct(engineTop, ps.length),
        ...(eloN > 0 ? { engineEloMatchesHumanPct: pct(eloMatch, eloN), engineEloPositions: eloN } : {}),
        humanBandsPct: humanBands.map((x) => pct(x, ps.length)),
        modelBandsPct: modelBands.map((x) => pct(x, ps.length)),
        ...(eloN > 0 ? { engineEloBandsPct: eloBands.map((x) => pct(x, eloN)) } : {}),
      };
    }
    const model: HumanMoveModel = {
      version: 3,
      features: [...HUMAN_FEATURES],
      base: base.map((x) => Math.round(x * 1e4) / 1e4),
      slope: slope.map((x) => Math.round(x * 1e4) / 1e4),
      curve: curve.map((x) => Math.round(x * 1e4) / 1e4),
      centre: CENTRE,
      scale: SCALE,
      shift,
      range: [lo, hi],
    };
    report.model = model;
    const out = resolve(__dirname, '../../audit-reports');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'human-move-fit.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (process.env.HUMAN_FIT_WRITE === '1') {
      writeFileSync(resolve(__dirname, '../data/human-move-model.json'), `${JSON.stringify(model, null, 1)}\n`);
    }
    console.log(JSON.stringify(report.buckets, null, 1));
    expect(all.length).toBeGreaterThan(1000);
    expect(misses, 'the model must make its mistakes at the players\' rate').toEqual([]);
  }, 3_600_000);
});
