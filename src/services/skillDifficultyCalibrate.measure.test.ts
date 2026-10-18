// SKILL DIFFICULTY CALIBRATION — the population table the skill meters read
// (2026-10-18). A rated Lichess sample spread evenly 600–2600, each move scored
// through the SAME computer the heat map uses (`capabilitiesPosed` +
// `movePlayedCleanly`), the move's cost read from the game's own [%eval]
// annotations (eval before − eval after, mover's view). Fits, per skill, the
// logistic P(hold | R) = 1 / (1 + 10^((D − R)/S)) and writes
// src/data/skill-difficulty.json. Not a gate.
// Run in shards, then fit:
//   SKILL_CALIBRATE=1 SKILL_SHARD=0/3 npx vitest run src/services/skillDifficultyCalibrate.measure.test.ts  (×3, in parallel)
//   SKILL_FIT=1 npx vitest run src/services/skillDifficultyCalibrate.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { capabilitiesPosed, movePlayedCleanly } from './capabilityEvidence';
import { meterOfTag } from './skillMeters';

const SRC = process.env.SKILL_SAMPLE ?? '/tmp/claude-0/meter/lichess/games.jsonl';
const HAVE = existsSync(SRC) && process.env.SKILL_CALIBRATE === '1';
const PLIES_PER_GAME = Number(process.env.PLIES_PER_GAME ?? 30);

/** Held / asked counts per rating bucket — what the fit needs, and small
 *  enough to save per shard so a long run can never be lost. */
type Buckets = Record<string, Record<string, [number, number]>>; // tag → bucket → [held, total]
const BUCKET = 25;

function fit(b: Record<string, [number, number]>): { D: number; S: number; ll: number } {
  const rows = Object.entries(b).map(([k, [h, t]]) => ({ r: Number(k) + BUCKET / 2, h, t }));
  let best = { D: 1500, S: 400, ll: -Infinity };
  for (let S = 200; S <= 2000; S += 50) {
    for (let D = -1500; D <= 3000; D += 10) {
      let ll = 0;
      for (const o of rows) {
        const p = 1 / (1 + Math.pow(10, (D - o.r) / S));
        ll += o.h * Math.log(Math.max(p, 1e-9)) + (o.t - o.h) * Math.log(Math.max(1 - p, 1e-9));
      }
      if (ll > best.ll) best = { D, S, ll };
    }
  }
  return best;
}

const SHARD = process.env.SKILL_SHARD; // "i/n": score that slice, save its buckets
const OUT_DIR = process.env.SKILL_OUT ?? '/tmp/claude-0/meter/shards';

describe.skipIf(!HAVE || !SHARD)('skill difficulty calibration — score a shard', () => {
  it('scores its slice of games and saves the buckets', async () => {
    const { mkdirSync, appendFileSync } = await import('node:fs');
    const [i, n] = (SHARD ?? '0/1').split('/').map(Number);
    mkdirSync(OUT_DIR, { recursive: true });
    const lines = readFileSync(SRC, 'utf8').split('\n').filter(Boolean).filter((_, k) => k % n === i);
    const buckets: Buckets = {};
    let scored = 0;
    lines.forEach((l, gi) => {
      const g = JSON.parse(l) as { w: number; b: number; sans: string[]; evals: number[] };
      const c = new Chess();
      for (let ply = 0; ply < g.sans.length; ply++) {
        const fen = c.fen();
        const color = ply % 2 === 0 ? 'white' : 'black';
        let ok = true;
        try { c.move(g.sans[ply]); } catch { ok = false; }
        if (!ok) break;
        if (ply < 8 || ply >= 8 + PLIES_PER_GAME) continue;
        const before = ply === 0 ? 20 : g.evals[ply - 1];
        const after = g.evals[ply];
        const loss = color === 'white' ? before - after : after - before;
        const r = color === 'white' ? g.w : g.b;
        const key = String(Math.floor(r / BUCKET) * BUCKET);
        for (const p of capabilitiesPosed(fen, g.sans[ply], color)) {
          if (!meterOfTag(p.tag)) continue;
          const t = (buckets[p.tag] ??= {});
          const cell = (t[key] ??= [0, 0]);
          if (movePlayedCleanly(loss)) cell[0]++;
          cell[1]++;
        }
        scored++;
      }
      if ((gi + 1) % 50 === 0 || gi === lines.length - 1) {
        writeFileSync(`${OUT_DIR}/shard-${i}.json`, JSON.stringify({ games: gi + 1, of: lines.length, scored, buckets }));
        appendFileSync(`${OUT_DIR}/progress.log`, `shard ${i}: ${gi + 1}/${lines.length}\n`);
      }
    });
    expect(scored).toBeGreaterThan(0);
  }, 7_000_000);
});

describe.skipIf(process.env.SKILL_FIT !== '1')('skill difficulty calibration — fit the shards', () => {
  it('fits each skill and writes the table', async () => {
    const { readdirSync } = await import('node:fs');
    const all: Buckets = {};
    let scored = 0;
    let games = 0;
    for (const f of readdirSync(OUT_DIR).filter((x) => /^shard-\d+\.json$/.test(x))) {
      const d = JSON.parse(readFileSync(`${OUT_DIR}/${f}`, 'utf8')) as { games: number; scored: number; buckets: Buckets };
      scored += d.scored;
      games += d.games;
      for (const [tag, b] of Object.entries(d.buckets)) {
        const t = (all[tag] ??= {});
        for (const [k, [h, n]] of Object.entries(b)) {
          const cell = (t[k] ??= [0, 0]);
          cell[0] += h;
          cell[1] += n;
        }
      }
    }
    const table: Record<string, { D: number; S: number; n: number; bands: Record<string, string> }> = {};
    for (const [tag, b] of Object.entries(all)) {
      const n = Object.values(b).reduce((a, [, t]) => a + t, 0);
      if (n < 100) continue;
      const { D, S } = fit(b);
      const bands: Record<string, string> = {};
      for (let lo = 600; lo < 2600; lo += 400) {
        let h = 0;
        let t = 0;
        for (const [k, [hh, tt]] of Object.entries(b)) if (Number(k) >= lo && Number(k) < lo + 400) { h += hh; t += tt; }
        bands[`${lo}`] = t >= 30 ? `${Math.round((100 * h) / t)}%` : '-';
      }
      table[tag] = { D, S, n, bands };
      console.log(`${tag.padEnd(26)} n=${String(n).padStart(6)} D=${D} S=${S} | ${Object.entries(bands).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    }
    writeFileSync('src/data/skill-difficulty.json', JSON.stringify({ _source: 'Lichess open database 2024-06, rated blitz/rapid/classical with [%eval], 600–2600 evenly; scored by capabilitiesPosed + movePlayedCleanly', games, scored, table }, null, 2) + '\n');
    console.log(`scored ${scored} moves from ${games} games`);
    expect(scored).toBeGreaterThan(0);
  }, 600_000);
});
