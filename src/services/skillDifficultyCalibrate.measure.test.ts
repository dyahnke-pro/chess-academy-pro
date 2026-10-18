// SKILL DIFFICULTY CALIBRATION — the population table the skill meters read
// (2026-10-18). A rated Lichess sample spread evenly 600–2600, each move scored
// through the SAME computer the heat map uses (`capabilitiesPosed` +
// `movePlayedCleanly`), the move's cost read from the game's own [%eval]
// annotations (eval before − eval after, mover's view). Fits, per skill, the
// logistic P(hold | R) = 1 / (1 + 10^((D − R)/S)) and writes
// src/data/skill-difficulty.json. Not a gate.
// Run: SKILL_CALIBRATE=1 npx vitest run src/services/skillDifficultyCalibrate.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { capabilitiesPosed, movePlayedCleanly } from './capabilityEvidence';
import { meterOfTag } from './skillMeters';

const SRC = process.env.SKILL_SAMPLE ?? '/tmp/claude-0/meter/lichess/games.jsonl';
const HAVE = existsSync(SRC) && process.env.SKILL_CALIBRATE === '1';
const PLIES_PER_GAME = Number(process.env.PLIES_PER_GAME ?? 30);

interface Obs { r: number; held: boolean }

function fit(obs: readonly Obs[]): { D: number; S: number; ll: number } {
  let best = { D: 1500, S: 400, ll: -Infinity };
  for (let S = 200; S <= 2000; S += 100) {
    for (let D = -1500; D <= 3000; D += 20) {
      let ll = 0;
      for (const o of obs) {
        const p = 1 / (1 + Math.pow(10, (D - o.r) / S));
        ll += Math.log(o.held ? Math.max(p, 1e-9) : Math.max(1 - p, 1e-9));
      }
      if (ll > best.ll) best = { D, S, ll };
    }
  }
  return best;
}

describe.skipIf(!HAVE)('skill difficulty calibration', () => {
  it('fits each skill on a rated population', () => {
    const lines = readFileSync(SRC, 'utf8').split('\n').filter(Boolean);
    const obs = new Map<string, Obs[]>();
    let scored = 0;
    for (const l of lines) {
      const g = JSON.parse(l) as { w: number; b: number; sans: string[]; evals: number[] };
      const c = new Chess();
      for (let i = 0; i < g.sans.length; i++) {
        const fen = c.fen();
        const color = i % 2 === 0 ? 'white' : 'black';
        let ok = true;
        try { c.move(g.sans[i]); } catch { ok = false; }
        if (!ok) break;
        if (i < 8 || i >= 8 + PLIES_PER_GAME) continue;
        const before = i === 0 ? 20 : g.evals[i - 1];
        const after = g.evals[i];
        const loss = color === 'white' ? before - after : after - before;
        const r = color === 'white' ? g.w : g.b;
        for (const p of capabilitiesPosed(fen, g.sans[i], color)) {
          if (!meterOfTag(p.tag)) continue;
          const list = obs.get(p.tag) ?? [];
          list.push({ r, held: movePlayedCleanly(loss) });
          obs.set(p.tag, list);
        }
        scored++;
      }
    }
    const table: Record<string, { D: number; S: number; n: number; bands: Record<string, string> }> = {};
    for (const [tag, list] of obs) {
      if (list.length < 100) continue;
      const { D, S } = fit(list);
      const bands: Record<string, string> = {};
      for (let lo = 600; lo < 2600; lo += 400) {
        const b = list.filter((o) => o.r >= lo && o.r < lo + 400);
        bands[`${lo}`] = b.length >= 30 ? `${Math.round((100 * b.filter((o) => o.held).length) / b.length)}%` : '-';
      }
      table[tag] = { D, S, n: list.length, bands };
      console.log(`${tag.padEnd(26)} n=${String(list.length).padStart(6)} D=${D} S=${S} | ${Object.entries(bands).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    }
    writeFileSync('src/data/skill-difficulty.json', JSON.stringify({ _source: 'Lichess open database 2024-06, rated blitz/rapid/classical with [%eval], 600–2600 evenly; scored by capabilitiesPosed + movePlayedCleanly', scored, table }, null, 2) + '\n');
    console.log(`scored ${scored} moves from ${lines.length} games`);
    expect(scored).toBeGreaterThan(0);
  }, 7_000_000);
});
