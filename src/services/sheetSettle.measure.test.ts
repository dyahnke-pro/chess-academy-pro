// Settle the fact-sheet moves whose two engine reads disagreed
// (WO-OPENINGS-REWRITE-01). The sheets built before `settleReads` printed a
// top-3 read and a move's own read that could contradict each other ("the
// engine's first choice" and "costs 1.41" for one move). This re-reads each
// such board the settled way — every candidate on its own — so the beats
// written from those sheets can be checked against one verdict.
//
//   SHEET_SETTLE=1 SHEET_SETTLE_IN=<positions.json> SHEET_SETTLE_OUT=<dir>
//   SHEET_SETTLE_SHARD=i/n  npx vitest run src/services/sheetSettle.measure.test.ts
//
// positions.json: [{ fen, uci, san, where: [...] }]. Each shard writes
// <dir>/settled-<i>.json after every board, so a killed run keeps its work.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';

const RUN = process.env.SHEET_SETTLE === '1';
const DEPTH = Number(process.env.SHEET_SETTLE_DEPTH ?? 16);

describe.skipIf(!RUN)('sheet settle — one verdict for each disagreeing move', () => {
  it('re-reads every candidate on its own', async () => {
    const { nativeEngine } = await import('../test/nativeStockfish');
    const { settleReads } = await import('../test/settleReads');
    const { Chess } = await import('chess.js');
    const IN = process.env.SHEET_SETTLE_IN ?? '';
    const OUT = process.env.SHEET_SETTLE_OUT ?? '';
    const [shard, shards] = (process.env.SHEET_SETTLE_SHARD ?? '0/1').split('/').map(Number);
    const all = JSON.parse(readFileSync(IN, 'utf8')) as Array<{ fen: string; uci: string; san: string; where: string[] }>;
    const mine = all.filter((_, i) => i % shards === shard);
    const outPath = `${OUT}/settled-${shard}.json`;
    const done: Record<string, unknown> = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) as Record<string, unknown> : {};
    const engine = nativeEngine(`${OUT}/engine-cache-${shard}.json`, DEPTH);
    const san = (fen: string, uci: string): string => {
      try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; }
    };
    let n = 0;
    for (const p of mine) {
      const key = `${p.fen}|${p.uci}`;
      if (done[key]) continue;
      const sign = p.fen.split(' ')[1] === 'b' ? -1 : 1;
      const s = await settleReads(engine.read, p.fen, p.uci);
      done[key] = {
        san: p.san,
        where: p.where,
        reread: s.reread,
        top: s.top.map((l) => ({ san: san(p.fen, l.pv[0] ?? ''), mover: (sign * l.cp) / 100 })),
        played: s.played ? (sign * s.played.cp) / 100 : null,
        cost: s.cost,
        firstChoice: s.top[0]?.pv[0] === p.uci,
      };
      writeFileSync(outPath, JSON.stringify(done, null, 1));
      engine.flush();
      n += 1;
      console.log(`[settle ${shard}/${shards}] ${Object.keys(done).length}/${mine.length} ${p.san} cost ${s.cost?.toFixed(2)}${s.reread ? ' (re-read)' : ''}`);
    }
    console.log(`settled ${n} new boards in shard ${shard}`);
  }, 12 * 60 * 60_000);
});
