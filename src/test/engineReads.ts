/**
 * The engine-backed computers' reads (`BundleEngine`) for measure/record runs
 * and their replay (never the app): the native Stockfish (`nativeEngine`) for
 * the searches and every legal move scored, its static `eval` table, a
 * tablebase lookup handed in. Every reply is kept in `log`, so a test can
 * store the reads and replay them with no engine (`recordedEngine`).
 */
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import type { ReplyRead } from '../services/ifTheyPlay';
import type { BundleEngine } from '../services/engineComputers';
import type { TablebaseMovesResult } from '../services/endgameTablebaseService';
import { NATIVE_SF, type NativeEngine } from './nativeStockfish';

export interface EngineLog {
  analyze: Record<string, StockfishAnalysis>;
  eval: Record<string, string>;
  every: Record<string, ReplyRead[]>;
  tablebase: Record<string, TablebaseMovesResult | null>;
}
export const emptyLog = (): EngineLog => ({ analyze: {}, eval: {}, every: {}, tablebase: {} });

/** Stockfish's static `eval` output for a board, up to its final line. */
export function evalTable(fen: string): Promise<string> {
  return new Promise((resolve) => {
    const sf = spawn(NATIVE_SF);
    let out = '';
    let done = false;
    const finish = (): void => { if (done) return; done = true; try { sf.kill(); } catch { /* gone */ } resolve(out); };
    sf.stdout.on('data', (d: Buffer) => { out += d.toString(); if (/Final evaluation/.test(out)) finish(); });
    sf.on('error', finish);
    sf.stdin.write(`position fen ${fen}\neval\n`);
    setTimeout(finish, 30_000);
  });
}

/** Every legal move on `fen` scored from the side to move's seat, its line —
 *  `humanReply.scoreEveryMove`'s shape. */
async function everyMove(e: NativeEngine, fen: string, depth: number): Promise<ReplyRead[]> {
  const n = new Chess(fen).moves().length;
  if (n === 0) return [];
  const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
  const lines = await e.read(fen, { multipv: n, depth });
  return lines.filter((l) => l.pv[0]).map((l) => ({ uci: l.pv[0], cp: l.mate !== null ? (l.mate * sign > 0 ? 2000 : -2000) : l.cp * sign, mate: l.mate === null ? null : l.mate * sign, pv: l.pv }));
}

/** The live engine as a `BundleEngine`, every read written into `log`. */
export function liveEngine(e: NativeEngine, log: EngineLog, tb: (fen: string) => Promise<TablebaseMovesResult | null>): BundleEngine {
  return {
    analyzePosition: async (fen, depth) => { const a = (await e.analysis(fen, { depth })) as StockfishAnalysis; log.analyze[`${depth}|${fen}`] = a; return a; },
    evalBoard: async (fen) => { const t = await evalTable(fen); log.eval[fen] = t; return t; },
    everyMove: async (fen) => { const r = await everyMove(e, fen, 8); log.every[fen] = r; return r; },
    tablebase: async (fen) => { const r = await tb(fen); log.tablebase[fen] = r; return r; },
  };
}

/** The stored reads as a `BundleEngine`: a board never read is a failed read. */
export function recordedEngine(log: EngineLog): BundleEngine {
  return {
    analyzePosition: (fen, depth) => { const a = log.analyze[`${depth}|${fen}`]; return a ? Promise.resolve(a) : Promise.reject(new Error(`no stored read ${fen}`)); },
    evalBoard: (fen) => { const t = log.eval[fen]; return t === undefined ? Promise.reject(new Error(`no stored eval ${fen}`)) : Promise.resolve(t); },
    everyMove: (fen) => Promise.resolve(log.every[fen] ?? null),
    tablebase: (fen) => Promise.resolve(log.tablebase[fen] ?? null),
  };
}
