// SKILL DIFFICULTY CALIBRATION — the population table the skill meters read
// (2026-10-18). A rated Lichess sample spread evenly 600–2600. Every move is
// scored by THE SAME PATH the student's record takes: engine reads per
// position (best move, its line, its eval; the played move's line and eval —
// `/tmp/claude-0/meter/engine.mjs`, Stockfish depth 12) become the game's
// annotations, `capabilityPliesFromAnnotations` turns them into plies, and
// `capabilityOutcomes` scores each one. A copy of that scoring once posed
// fewer questions and broke every posed skill on a costly move, so a 1414
// student read Endgames Level 29; one function, both sides, cannot drift.
// Fits, per skill, P(hold | R) = 1 / (1 + 10^((D − R)/S)) and writes
// src/data/skill-difficulty.json. Not a gate.
//   SKILL_CALIBRATE=1 SKILL_SHARD=0/4 npx vitest run src/services/skillDifficultyCalibrate.measure.test.ts  (one per reads file)
//   SKILL_FIT=1 SKILL_FIT_DIRS=<out> npx vitest run src/services/skillDifficultyCalibrate.measure.test.ts
// The sample and its reads are committed scripts (2026-10-22 — the first
// sample lived in /tmp and died with its container):
//   node scripts/meter/sample-lichess.mjs /tmp/claude-0/meter 4000 600
//   node scripts/meter/engine-reads.mjs /tmp/claude-0/meter/games.jsonl /tmp/claude-0/meter/eng i/n   (one per shard)
// SKILL_FIT_ONLY_NEW=1 adds the rows the table lacks (a new motif tag) and
// keeps every existing row as fitted, so no student's meters move.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { capabilityOutcomes } from './capabilityEvidence';
import { capabilityPliesFromAnnotations, measuredCpLoss, plyScoringArgs } from './autoAnalyzeGame';
import { classifyCpLoss } from './gameAnalysisService';
import { meterOfTag } from './skillMeters';
import { mateEvalFor } from './engineConstants';
import type { MoveAnnotation } from '../types';

const READS = process.env.SKILL_READS ?? '/tmp/claude-0/meter/eng';
const HAVE = existsSync(READS) && process.env.SKILL_CALIBRATE === '1';

type Buckets = Record<string, Record<string, [number, number]>>; // tag → bucket → [held, total]
const BUCKET = 25;

function fit(b: Record<string, [number, number]>): { D: number; S: number; ll: number } {
  const rows = Object.entries(b).map(([k, [h, t]]) => ({ r: Number(k) + BUCKET / 2, h, t }));
  let best = { D: 1500, S: 400, ll: -Infinity };
  for (let S = 200; S <= 6000; S += 50) {
    for (let D = -4000; D <= 3000; D += 10) {
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

/** One engine read. A mate is kept as its distance (White's view) and turned
 *  into a stored eval by the app's own `mateEvalFor`, never a second rule. */
interface Read { best: string | null; cp: number | null; mate?: number | null; pv: string[] }
const evalOf = (r: Read): number | null => (typeof r.mate === 'number' ? mateEvalFor(r.mate) : r.cp);

/** One game's annotations, as a review would store them, from the reads. */
function annotationsOf(sans: readonly string[], fens: readonly string[], reads: readonly Read[]): MoveAnnotation[] {
  const out: MoveAnnotation[] = [];
  for (let p = 0; p < sans.length; p++) {
    const before = reads[p];
    const after = reads[p + 1];
    if (!before || !after) break;
    const color = p % 2 === 0 ? 'white' : 'black';
    const base: MoveAnnotation = {
      moveNumber: Math.floor(p / 2) + 1, color, san: sans[p],
      evaluation: evalOf(after), bestMove: before.best, bestMoveEval: evalOf(before),
      classification: 'good', comment: null,
    };
    const cpLoss = measuredCpLoss(base) ?? 0;
    const classification = classifyCpLoss(cpLoss, evalOf(before), evalOf(after), color === 'white', sans[p].includes('#'), fens[p], sans[p]);
    const flagged = classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder';
    out.push({
      ...base, classification,
      // A review keeps the two lines, and the one-search cost, on flagged plies only.
      ...(flagged ? { pv: { afterPlayed: after.pv, afterBest: before.pv.slice(1), depth: 12 }, costCp: cpLoss } : {}),
    });
  }
  return out;
}

const SHARD = process.env.SKILL_SHARD; // "i/n": score reads-i.jsonl, save its buckets
const OUT_DIR = process.env.SKILL_OUT ?? '/tmp/claude-0/meter/shards3';

describe.skipIf(!HAVE || !SHARD)('skill difficulty calibration — score a shard', () => {
  it('scores its reads file through the record path and saves the buckets', async () => {
    const { mkdirSync, appendFileSync } = await import('node:fs');
    const [i] = (SHARD ?? '0/1').split('/').map(Number);
    mkdirSync(OUT_DIR, { recursive: true });
    const lines = readFileSync(`${READS}/reads-${i}.jsonl`, 'utf8').split('\n').filter(Boolean);
    // RESUME from this shard's own checkpoint (same reads file, same OUT_DIR),
    // so a stopped run loses at most the games since its last save. A fresh
    // run takes a fresh SKILL_OUT.
    const saved = (() => {
      try { return JSON.parse(readFileSync(`${OUT_DIR}/shard-${i}.json`, 'utf8')) as { games: number; of: number; scored: number; buckets: Buckets }; } catch { return null; }
    })();
    const resume = saved && saved.of === lines.length && saved.games < lines.length ? saved : null;
    const buckets: Buckets = resume?.buckets ?? {};
    let scored = resume?.scored ?? 0;
    if (resume) appendFileSync(`${OUT_DIR}/progress.log`, `shard ${i}: resumed at ${resume.games}/${lines.length}\n`);
    lines.forEach((l, gi) => {
      if (resume && gi < resume.games) return;
      const g = JSON.parse(l) as { w: number; b: number; sans: string[]; reads: Read[] };
      const c = new Chess();
      const fens = [c.fen()];
      for (const san of g.sans) { c.move(san); fens.push(c.fen()); }
      const anns = annotationsOf(g.sans, fens, g.reads);
      for (const color of ['white', 'black'] as const) {
        const r = color === 'white' ? g.w : g.b;
        const key = String(Math.floor(r / BUCKET) * BUCKET);
        for (const ply of capabilityPliesFromAnnotations(anns, color, fens)) {
          const outcomes = capabilityOutcomes(plyScoringArgs(ply, color));
          for (const o of outcomes) {
            if (!meterOfTag(o.tag)) continue;
            const cell = ((buckets[o.tag] ??= {})[key] ??= [0, 0]);
            if (o.outcome === 'held') cell[0]++;
            cell[1]++;
          }
          scored++;
        }
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
    const dirs = (process.env.SKILL_FIT_DIRS ?? OUT_DIR).split(',');
    const files = dirs.flatMap((dir) => (existsSync(dir) ? readdirSync(dir) : []).filter((x) => /^shard-\d+\.json$/.test(x)).map((x) => `${dir}/${x}`));
    for (const f of files) {
      const d = JSON.parse(readFileSync(f, 'utf8')) as { games: number; scored: number; buckets: Buckets };
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
      // Under 500 answers the curve is noise (non-monotone bands): an honest
      // "not calibrated" scores nothing rather than a guessed difficulty.
      if (n < 500) continue;
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
    if (process.env.SKILL_FIT_ONLY_NEW === '1') {
      const current = JSON.parse(readFileSync('src/data/skill-difficulty.json', 'utf8')) as { table: Record<string, unknown> } & Record<string, unknown>;
      const added = Object.keys(table).filter((t) => !(t in current.table));
      for (const t of added) current.table[t] = { ...table[t], src: `refit ${games} games` };
      current._refit = `${new Date().toISOString().slice(0, 10)}: ${added.length} new row(s) from ${games} games of the same month, scored by the same path; existing rows kept as fitted`;
      writeFileSync('src/data/skill-difficulty.json', JSON.stringify(current, null, 2) + '\n');
      console.log(`added ${added.length} row(s): ${added.join(', ')}`);
    } else {
      writeFileSync('src/data/skill-difficulty.json', JSON.stringify({ _source: 'Lichess open database 2024-06, rated blitz/rapid/classical with [%eval], 600–2600 evenly; scored through the record path (capabilityPliesFromAnnotations + capabilityOutcomes), Stockfish depth 12 reads', games, scored, table }, null, 2) + '\n');
    }
    console.log(`scored ${scored} moves from ${games} games`);
    expect(scored).toBeGreaterThan(0);
  }, 600_000);
});
