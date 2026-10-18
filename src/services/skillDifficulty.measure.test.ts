// SKILL DIFFICULTY — how hard each skill question is, measured on the
// POPULATION, never on the student (2026-10-18, the skill meters). Scores every
// move of every rated player in the analysed games through the SAME computer the
// heat map uses (`capabilitiesPosed` + `movePlayedCleanly`), then fits, per
// skill, the rating that holds it half the time. Not a gate.
// Run: SKILL_DIFFICULTY=1 npx vitest run src/services/skillDifficulty.measure.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { capabilitiesPosed, movePlayedCleanly } from './capabilityEvidence';
import { meterOfTag } from './skillMeters';

const SRC = 'audit-reports/.fixtures/data-drop-david.json';
const HAVE = existsSync(SRC) && process.env.SKILL_DIFFICULTY === '1';

interface Ann { color: 'white' | 'black'; san: string; evaluation: number | null; bestMoveEval: number | null }
interface G { id: string; pgn: string; white: string; black: string; whiteElo?: number | string; blackElo?: number | string; annotations?: Ann[] }

/** Fit D in P(hold | R) = 1 / (1 + 10^((D − R)/400)) by a 1-D search on the
 *  log-likelihood. */
function fitD(obs: Array<{ r: number; held: boolean }>): number {
  let best = 1500, bestLl = -Infinity;
  for (let d = 0; d <= 3000; d += 10) {
    let ll = 0;
    for (const o of obs) {
      const p = 1 / (1 + Math.pow(10, (d - o.r) / 400));
      ll += Math.log(o.held ? Math.max(p, 1e-9) : Math.max(1 - p, 1e-9));
    }
    if (ll > bestLl) { bestLl = ll; best = d; }
  }
  return best;
}

describe.skipIf(!HAVE)('skill difficulty from the population', () => {
  it('fits a difficulty per skill on every rated move', () => {
    const data = JSON.parse(readFileSync(SRC, 'utf8')) as { stores: { games: G[]; profiles: Array<{ preferences?: Record<string, unknown> }> } };
    const prefs = data.stores.profiles[0]?.preferences ?? {};
    const me = new Set(Object.entries(prefs)
      .filter(([k, v]) => /username/i.test(k) && typeof v === 'string' && v.length > 0)
      .map(([, v]) => (v as string).toLowerCase()));
    expect(me.size).toBeGreaterThan(0);
    const obs = new Map<string, Array<{ r: number; held: boolean; me: boolean; imp: number }>>();
    let moves = 0;
    for (const g of data.stores.games) {
      if (!g.annotations?.length) continue;
      const wElo = Number(g.whiteElo), bElo = Number(g.blackElo);
      if (!wElo || !bElo) continue;
      const c = new Chess();
      try { c.loadPgn(g.pgn); } catch { continue; }
      const sans = c.history();
      const replay = new Chess();
      for (let i = 0; i < sans.length && i < g.annotations.length; i++) {
        const a = g.annotations[i];
        const fen = replay.fen();
        if (a.san !== sans[i]) break;
        const loss = a.evaluation == null || a.bestMoveEval == null ? null
          : a.color === 'white' ? a.bestMoveEval - a.evaluation : a.evaluation - a.bestMoveEval;
        const isMe = me.has((a.color === 'white' ? g.white : g.black).toLowerCase());
        const r = a.color === 'white' ? wElo : bElo;
        for (const p of capabilitiesPosed(fen, sans[i], a.color)) {
          if (!meterOfTag(p.tag)) continue;
          const held = movePlayedCleanly(loss);
          const list = obs.get(p.tag) ?? [];
          list.push({ r, held, me: isMe, imp: p.posedImportance });
          obs.set(p.tag, list);
        }
        replay.move(sans[i]);
        moves++;
      }
    }
    const rows = [...obs].map(([tag, list]) => {
      const pop = list.filter((o) => !o.me);
      const D = fitD(pop);
      const holdRate = (l: typeof list) => (l.length ? Math.round((100 * l.filter((o) => o.held).length) / l.length) : null);
      return { tag, meter: meterOfTag(tag), n: pop.length, D, popHold: holdRate(pop), meN: list.length - pop.length, meHold: holdRate(list.filter((o) => o.me)) };
    }).sort((a, b) => b.n - a.n);
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/skill-difficulty.json', JSON.stringify({ moves, rows }, null, 2));
    console.log(`moves ${moves}`);
    for (const r of rows) console.log(`${r.tag.padEnd(26)} ${String(r.meter).padEnd(12)} pop n=${String(r.n).padStart(5)} hold ${r.popHold}% D=${r.D} | you n=${r.meN} hold ${r.meHold}%`);
    expect(moves).toBeGreaterThan(0);
  }, 600_000);
});
