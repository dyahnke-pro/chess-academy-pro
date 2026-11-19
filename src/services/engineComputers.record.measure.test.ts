/**
 * RECORD: Danya's try boards read by a local Stockfish, every engine-backed
 * computer on each future board, the reads stored for the replay test.
 * Run: ENGINE_RECORD=1 ENGINE_RECORD_IN=<rows.json> ENGINE_RECORD_OUT=<file>
 *   [ENGINE_RECORD_IDS=<id|try,…>] [ENGINE_RECORD_CACHE=<file>]
 *   npx vitest run src/services/engineComputers.record.measure.test.ts
 */
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { emptyLog, liveEngine } from '../test/engineReads';
import { nativeEngine } from '../test/nativeStockfish';
import { engineFutureFacts, type LineRead } from './futures';
import type { TablebaseMovesResult } from './endgameTablebaseService';

const ON = process.env.ENGINE_RECORD === '1';

async function lichessTb(fen: string): Promise<TablebaseMovesResult | null> {
  if (fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length > 7) return null;
  try {
    const r = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { category: string };
    return { category: j.category } as TablebaseMovesResult;
  } catch { return null; }
}

describe.skipIf(!ON)('record the engine-backed reads on Danya\'s try boards', () => {
  it('records', async () => {
    const rows = JSON.parse(readFileSync(process.env.ENGINE_RECORD_IN as string, 'utf8')) as Array<{ id: string; try: string; fen: string; student?: 'w' | 'b' }>;
    const e = nativeEngine(process.env.ENGINE_RECORD_CACHE ?? '/tmp/engine-record-cache.json', 12);
    const log = emptyLog();
    const eng = liveEngine(e, log, lichessTb);
    const out: unknown[] = [];
    const seenKey = new Set<string>();
    const ids = process.env.ENGINE_RECORD_IDS ? new Set(process.env.ENGINE_RECORD_IDS.split(',')) : null;
    for (const r of rows) {
      if (ids && !ids.has(`${r.id}|${r.try}`)) continue;
      const k = `${r.id}|${r.try}|${r.student ?? ''}`;
      if (seenKey.has(k)) continue;
      seenKey.add(k);
      const c = new Chess(r.fen);
      let m;
      try { m = c.move(r.try); } catch { continue; }
      const tryUci = `${m.from}${m.to}${m.promotion ?? ''}`;
      const after = await eng.analyzePosition(c.fen(), 12);
      const root = await eng.analyzePosition(r.fen, 12);
      const tl = after.topLines[0];
      const bl = root.topLines[0];
      if (!tl || !bl) continue;
      const tryLine: LineRead = { moves: [tryUci, ...tl.moves], cp: tl.mate !== null ? null : tl.evaluation, mate: tl.mate };
      const bestLine: LineRead = { moves: bl.moves, cp: bl.mate !== null ? null : bl.evaluation, mate: bl.mate };
      const student = r.student ?? (r.fen.split(' ')[1] === 'b' ? 'b' : 'w');
      const args = { fen: r.fen, student, rating: 1800, tryLine, bestLine } as const;
      const more = await engineFutureFacts(args, eng);
      const said = (xs: Record<string, Array<{ computer: string; text: string }> | undefined>) =>
        Object.fromEntries(Object.entries(xs).map(([at, fs]) => [at, (fs ?? []).map((f) => `${f.computer}: ${f.text}`)]));
      out.push({ id: r.id, try: r.try, args, onTry: said(more.onTry), onBest: said(more.onBest) });
      writeFileSync(process.env.ENGINE_RECORD_OUT as string, JSON.stringify({ rows: out, log }, null, 0));
      console.log(`${out.length} ${k}`);
    }
    e.flush();
  }, 3_600_000);
});
