/**
 * THE BOARD READ, OFF THE MAIN THREAD — the worker's half (2026-11-19).
 *
 * A board read (`boardReadFacts`) is ~9 s of pure computer CPU per board in
 * this container (every try refuted, every future read by every computer,
 * the picture's conclusions, the best move's facts), ~4× that on a phone: run
 * on the main thread it freezes the screen. This runs the SAME function in a
 * worker. The engine stays where it is: every engine read the computers ask
 * for (`read`, `extra.evalBoard`) is sent back to the main thread, which owns
 * Stockfish, and its answer comes back here. So the facts are the same
 * function's, on the same reads — only the thread differs.
 *
 * The data the computers look up synchronously (the masters' moves, the
 * opening positions, the club gems …) is mirrored from the page before each
 * read (`boardReadData`), so the worker never reads it colder than the page.
 *
 * No DOM: a `Port` is whatever carries the messages (`self` in the browser's
 * worker, a `worker_threads` port in a test).
 */
import { boardReadFacts, type BoardReadInput, type BoardFactSet } from './boardReadFacts';
import type { AnalysisLine } from '../types';
import type { TrySource } from './tryReadBudget';
import { applyMirror, type DataMirror } from './boardReadData';
import { setNativeApp } from '../utils/webOrigin';

/** The read's input with its two engine functions taken out: the rest is
 *  plain data (structured-cloneable). */
export type BoardReadPayload = Omit<BoardReadInput, 'read' | 'extra'> & {
  extra?: Omit<NonNullable<BoardReadInput['extra']>, 'evalBoard'>;
};

export type ToWorker =
  | { t: 'read'; id: number; input: BoardReadPayload; evalBoard: boolean; mirror: DataMirror; native: boolean }
  | { t: 'engine-reply'; call: number; ok: boolean; value: unknown };

export type FromWorker =
  | { t: 'engine'; id: number; call: number; kind: 'read'; fen: string; source: TrySource }
  | { t: 'engine'; id: number; call: number; kind: 'eval'; fen: string }
  | { t: 'done'; id: number; ok: true; value: BoardFactSet }
  | { t: 'done'; id: number; ok: false; error: string };

export interface Port {
  postMessage(msg: FromWorker): void;
  onMessage(handler: (msg: ToWorker) => void): void;
}

/** Serve board reads on `port` until the port closes. */
export function serveBoardReads(port: Port): void {
  let nextCall = 1;
  const waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  const ask = (msg: FromWorker & { t: 'engine' }): Promise<unknown> => new Promise((resolve, reject) => {
    waiting.set(msg.call, { resolve, reject });
    port.postMessage(msg);
  });

  port.onMessage((msg) => {
    if (msg.t === 'engine-reply') {
      const w = waiting.get(msg.call);
      if (!w) return;
      waiting.delete(msg.call);
      if (msg.ok) w.resolve(msg.value);
      else w.reject(new Error(String(msg.value)));
      return;
    }
    const { id, input } = msg;
    const read = (fen: string, source: TrySource): Promise<readonly AnalysisLine[] | null> =>
      ask({ t: 'engine', id, call: nextCall++, kind: 'read', fen, source }) as Promise<readonly AnalysisLine[] | null>;
    const evalBoard = msg.evalBoard
      ? (fen: string): Promise<string> => ask({ t: 'engine', id, call: nextCall++, kind: 'eval', fen }) as Promise<string>
      : undefined;
    const full: BoardReadInput = {
      ...input,
      read,
      ...(input.extra || evalBoard ? { extra: { ...(input.extra ?? {}), ...(evalBoard ? { evalBoard } : {}) } } : {}),
    };
    setNativeApp(msg.native);
    // The data the page holds, in memory here before the read looks it up.
    applyMirror(msg.mirror).then(() => boardReadFacts(full)).then(
      (value) => port.postMessage({ t: 'done', id, ok: true, value }),
      (e: unknown) => port.postMessage({ t: 'done', id, ok: false, error: e instanceof Error ? e.message : String(e) }),
    );
  });
}
