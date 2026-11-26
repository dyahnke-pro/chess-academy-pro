// The costly moves no cause explains (audit-reports/mistake-cause-measure.json,
// kind 'unexplained', David's 12 games) read by the missing cause readers.
// Saved data only; skipped where the reports are not on disk.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { minorRetreat, missedTempo, pawnLetGo, rookActivityLost } from './causeReaders';
import { bishopShutBy } from './theirMoveCost';

const MEASURE = 'audit-reports/mistake-cause-measure.json';
const DIR = 'audit-reports/teaching-census-data';
interface Read { ply: number; before: Array<{ uci: string; pv: string[] }>; after: Array<{ uci: string; pv: string[] }> }

describe.skipIf(!existsSync(MEASURE) || !existsSync(DIR))('the unexplained costly moves', () => {
  it('reports which reader explains each', () => {
    const rows = (JSON.parse(readFileSync(MEASURE, 'utf8')) as { rows: Array<{ game: string; ply: number; san: string; fen: string; cost: number; cause: { kind: string } }> }).rows
      .filter((r) => r.cause?.kind === 'unexplained');
    const games = new Map<string, { reads: Read[] }>();
    for (const f of readdirSync(DIR).filter((n) => /^g-/.test(n))) for (const l of readFileSync(`${DIR}/${f}`, 'utf8').split('\n').filter(Boolean)) { const g = JSON.parse(l); games.set(g.id, g); }
    const out: string[] = [];
    let hit = 0;
    for (const r of rows) {
      const rd = games.get(r.game)?.reads.find((x) => x.ply === r.ply);
      const bestUci = rd?.before[0]?.pv ?? null;
      const bestSan = (() => { try { const u = bestUci?.[0]; return u ? new Chess(r.fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san : null; } catch { return null; } })();
      const reply = rd?.after[0]?.pv ?? [];
      const found = [
        minorRetreat(r.fen, r.san) && 'minorRetreat',
        bishopShutBy(r.fen, r.san) && 'bishopShutBy',
        missedTempo(r.fen, r.san, bestSan) && 'missedTempo',
        pawnLetGo(r.fen, r.san, reply, bestUci) && 'pawnLetGo',
        rookActivityLost(r.fen, r.san, bestSan) && 'rookActivityLost',
      ].filter(Boolean);
      if (found.length) hit += 1;
      out.push(`${r.game} ${r.ply} ${r.san} (${r.cost}): ${found.join(', ') || '—'}`);
    }
    console.log(`${hit} of ${rows.length}\n${out.join('\n')}`);
    expect(rows.length).toBeGreaterThan(0);
  });
});
