// nativeStockfish — the engine the app's computers ask, served by the native
// Stockfish binary at a FIXED depth, for measure tests and offline bakes.
// A time budget (the app's `analyzeWithBudget`) gives a different read on a
// different machine; a fixed depth gives the same lesson every run, which is
// what a baked course needs (WO-OPENINGS-REWRITE-01, David 2026-11-11: "it
// needs to be done deterministically").
//
// Reads are cached on disk by (fen, multipv, depth, searchmoves), so a re-run
// costs nothing and a killed run keeps what it read.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mateEvalFor } from '../services/engineConstants';

export const NATIVE_SF = '/usr/games/stockfish';

export interface NativeLine { cp: number; mate: number | null; pv: string[] }

export interface NativeEngine {
  /** White's point of view, ranked best first (MultiPV). */
  read(fen: string, opts?: { multipv?: number; depth?: number; searchmoves?: string }): Promise<NativeLine[]>;
  /** The app's `StockfishAnalysis` shape, at the engine's fixed depth. */
  analysis(fen: string, opts?: { multipv?: number; depth?: number; searchmoves?: string }): Promise<{
    bestMove: string; evaluation: number; isMate: boolean; mateIn: number | null; depth: number;
    topLines: Array<{ rank: number; evaluation: number; moves: string[]; mate: number | null; depth: number }>;
    nodesPerSecond: number;
  }>;
  flush(): void;
}

export function nativeEngine(cachePath: string, defaultDepth: number): NativeEngine {
  const cache: Record<string, NativeLine[]> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) as Record<string, NativeLine[]> : {};
  let dirty = 0;
  const flush = (): void => {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(cache));
  };
  const read = (fen: string, opts: { multipv?: number; depth?: number; searchmoves?: string } = {}): Promise<NativeLine[]> => {
    const depth = opts.depth ?? defaultDepth;
    const multipv = Math.max(1, opts.multipv ?? 3);
    const key = `${fen}|${multipv}|${depth}|${opts.searchmoves ?? ''}`;
    if (cache[key]) return Promise.resolve(cache[key]);
    return new Promise((resolve) => {
      const sf = spawn(NATIVE_SF);
      const byRank = new Map<number, NativeLine>();
      const flip = fen.split(' ')[1] === 'b' ? -1 : 1;
      let done = false;
      let buf = '';
      const finish = (): void => {
        if (done) return;
        done = true;
        try { sf.kill(); } catch { /* gone */ }
        const lines = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
        cache[key] = lines;
        if (++dirty % 50 === 0) flush();
        resolve(lines);
      };
      sf.stdout.on('data', (d: Buffer) => {
        buf += d.toString();
        const parts = buf.split('\n');
        buf = parts.pop() ?? '';
        for (const ln of parts) {
          if (ln.startsWith('bestmove')) { finish(); continue; }
          if (!ln.startsWith('info') || !/ pv /.test(ln) || / bound /.test(ln)) continue;
          const rank = Number(/ multipv (\d+)/.exec(ln)?.[1] ?? 1);
          const cp = /score cp (-?\d+)/.exec(ln);
          const mt = /score mate (-?\d+)/.exec(ln);
          const pv = / pv (.+)$/.exec(ln)?.[1].trim().split(/\s+/) ?? [];
          const mate = mt ? Number(mt[1]) * flip : null;
          byRank.set(rank, { cp: cp ? Number(cp[1]) * flip : mt ? mateEvalFor(Number(mt[1])) * flip : 0, mate, pv });
        }
      });
      sf.on('error', finish);
      sf.stdin.write(`setoption name Threads value 1\nsetoption name MultiPV value ${multipv}\nposition fen ${fen}\ngo depth ${depth}${opts.searchmoves ? ` searchmoves ${opts.searchmoves}` : ''}\n`);
      setTimeout(finish, 120_000);
    });
  };
  const analysis: NativeEngine['analysis'] = async (fen, opts = {}) => {
    const depth = opts.depth ?? defaultDepth;
    const lines = await read(fen, opts);
    const top = lines[0];
    return {
      bestMove: top?.pv[0] ?? '',
      evaluation: top?.cp ?? 0,
      isMate: top?.mate != null,
      mateIn: top?.mate ?? null,
      depth,
      topLines: lines.map((l, i) => ({ rank: i + 1, evaluation: l.cp, moves: l.pv, mate: l.mate, depth })),
      nodesPerSecond: 0,
    };
  };
  return { read, analysis, flush };
}
