// THE SPEEDRUN REPLAY (WO-SPEEDRUN-01): Danya's 20 speedrun games walked
// through the same Learn lane and Review the decision baseline walks, with
// their engine reads (scripts/bench/danya-reads.mjs, depth 14) — every line
// each surface would speak on each of his moves, on the build in hand, with no
// browser. Run on demand:
//   SPEEDRUN_REPLAY=<dir with games.json and reads/> npx vitest run src/test/speedrunReplay.measure.test.ts
// writes audit-reports/speedrun-replay.json.
import { describe, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { learnSource, reviewSource, type FixtureGame } from './replaySources';
import type { PlyReads } from './replayGame';

const DIR = process.env.SPEEDRUN_REPLAY;

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
    for (const g of games) {
      const rs: PlyReads[] = [];
      for (let k = 0; k < g.sans.length; k++) {
        const r = reads.get(`vc-${g.video}-${String(k + 1).padStart(3, '0')}`);
        if (r) rs.push({ ply: k + 1, before: r.before, after: r.after });
      }
      if (rs.length < g.sans.length) continue;
      const fg: FixtureGame = { id: g.video, rating: g.set === 'low' ? 700 : 2000, studentSide: g.studentSide, sans: g.sans, reads: rs };
      out[g.video] = { set: g.set, review: (await reviewSource(fg)).spoken, learn: (await learnSource(fg)).spoken };
    }
    if (!existsSync('audit-reports')) mkdirSync('audit-reports');
    writeFileSync('audit-reports/speedrun-replay.json', JSON.stringify(out, null, 1));
  }, 3_600_000);
});
