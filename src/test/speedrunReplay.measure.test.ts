// THE SPEEDRUN REPLAY (WO-SPEEDRUN-01): Danya's 20 speedrun games walked
// through the same Learn lane and Review the decision baseline walks, with
// their engine reads (scripts/bench/danya-reads.mjs, depth 14) — every line
// each surface would speak on each of his moves, on the build in hand, with no
// browser. Run on demand:
//   SPEEDRUN_REPLAY=<dir with games.json and reads/> npx vitest run src/test/speedrunReplay.measure.test.ts
// writes audit-reports/speedrun-replay.json, and audit-reports/speedrun-weighed.json:
// every line each deciding place WEIGHED on each move (said or held, and why,
// `everythingEvents`) — how a regrade tells a quiet computer from a missing one.
import { describe, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { learnSource, reviewSource, type FixtureGame } from './replaySources';
import type { PlyReads } from './replayGame';
import { onEverything, type EverythingRow } from '../services/everythingEvents';

const DIR = process.env.SPEEDRUN_REPLAY;

/** A weighed row, kept small: the board, the move, and each line's computer,
 *  words, whether it spoke and why not. */
const slim = (r: EverythingRow) => ({ door: r.door, ply: r.at?.ply ?? null, san: r.at?.san ?? null, fen: r.at?.fen ?? null,
  lines: r.lines.map((l) => ({ c: l.computer, k: l.kind, t: l.text, said: l.said, why: l.why })) });

describe.skipIf(!DIR)('speedrun replay', () => {
  it('walks every game through Learn and Review', async () => {
    const dir = DIR as string;
    const games = JSON.parse(readFileSync(`${dir}/games.json`, 'utf8')) as Array<{ video: string; set: string; studentSide: 'white' | 'black'; sans: string[] }>;
    const reads = new Map<string, { before: PlyReads['before']; after: PlyReads['after'] }>();
    for (const f of readdirSync(`${dir}/reads`)) {
      for (const l of readFileSync(`${dir}/reads/${f}`, 'utf8').split('\n')) {
        if (!l.startsWith('{')) continue;
        const r = JSON.parse(l) as { id: string; before?: PlyReads['before']; after?: PlyReads['after'] };
        if (r.before) reads.set(r.id, { before: r.before, after: r.after ?? [] });
      }
    }
    const out: Record<string, { set: string; review: string[]; learn: string[] }> = {};
    const weighed: Record<string, { review: ReturnType<typeof slim>[]; learn: ReturnType<typeof slim>[] }> = {};
    for (const g of games) {
      const rs: PlyReads[] = [];
      for (let k = 0; k < g.sans.length; k++) {
        const r = reads.get(`vc-${g.video}-${String(k + 1).padStart(3, '0')}`);
        if (r) rs.push({ ply: k + 1, before: r.before, after: r.after });
      }
      if (rs.length < g.sans.length) continue;
      const fg: FixtureGame = { id: g.video, rating: g.set === 'low' ? 700 : 2000, studentSide: g.studentSide, sans: g.sans, reads: rs };
      const rows: EverythingRow[] = [];
      const off = onEverything((r) => { rows.push(r); });
      let review: string[] = [];
      let learn: string[] = [];
      try {
        review = (await reviewSource(fg)).spoken;
        const cut = rows.length;
        learn = (await learnSource(fg)).spoken;
        weighed[g.video] = {
          review: rows.slice(0, cut).map(slim),
          learn: rows.slice(cut).map(slim),
        };
      } finally { off(); }
      out[g.video] = { set: g.set, review, learn };
    }
    if (!existsSync('audit-reports')) mkdirSync('audit-reports');
    writeFileSync('audit-reports/speedrun-replay.json', JSON.stringify(out, null, 1));
    writeFileSync('audit-reports/speedrun-weighed.json', JSON.stringify(weighed));
  }, 3_600_000);
});
