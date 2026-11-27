/**
 * THE BOARD READ, OFF THE MAIN THREAD — the main thread's half (2026-11-19).
 *
 * `boardReadOffThread(i)` answers exactly what `boardReadFacts(i)` answers,
 * with its computers run in ONE long-lived worker (`boardRead.worker.ts`):
 * the main thread only posts the board, answers the worker's engine asks
 * (`i.read`, `i.extra.evalBoard` — Stockfish stays on this side) and takes the
 * facts back. Where no worker can run (tests, an old WebView, a worker that
 * failed to load, an input that cannot be cloned) the read runs here as
 * before, and the fallback is LOGGED (`board-read-worker-fallback`), never
 * silent.
 */
import { boardReadFacts, type BoardReadInput, type BoardFactSet } from './boardReadFacts';
import type { BoardReadPayload, ToWorker, FromWorker } from './boardReadWorkerCore';
import { createMirrorSender, type DataMirror } from './boardReadData';
import { isNativeApp } from '../utils/webOrigin';

/** What the client needs of a worker (the browser's `Worker`, or a test's). */
export interface WorkerLike {
  postMessage(msg: ToWorker): void;
  onmessage: ((e: { data: FromWorker }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  terminate(): void;
}

export type FallbackReason = 'no-worker' | 'worker-failed' | 'not-cloneable';

function browserWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./boardRead.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
}

function logFallback(reason: FallbackReason, detail: string): void {
  void import('./appAuditor').then(({ logAppAudit }) => logAppAudit({
    kind: 'board-read-worker-fallback',
    category: 'subsystem',
    source: 'boardReadOffThread',
    summary: `board read ran on the main thread: ${reason}`,
    details: detail,
  })).catch(() => { /* the log is best-effort; the read already ran */ });
}

interface Pending {
  input: BoardReadInput;
  resolve: (v: BoardFactSet) => void;
  reject: (e: Error) => void;
}

export interface BoardReadClient {
  read(i: BoardReadInput): Promise<BoardFactSet>;
  /** Start the worker now, so its module is loaded before the first read. */
  warm(): void;
}

/** A client over the worker `make` gives (null: no worker here). The worker is
 *  made on the first read and kept; one that fails is dropped for good and
 *  every read after runs on the main thread. */
export function createBoardReadClient(
  make: () => WorkerLike | null,
  onFallback: (reason: FallbackReason, detail: string) => void = logFallback,
): BoardReadClient {
  let worker: WorkerLike | null = null;
  let broken = false;
  let failed = false;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  const mirror = createMirrorSender();
  const logged = new Set<FallbackReason>();
  const fallback = (reason: FallbackReason, detail: string, i: BoardReadInput): Promise<BoardFactSet> => {
    if (!logged.has(reason)) { logged.add(reason); onFallback(reason, detail); }
    return boardReadFacts(i);
  };

  const fail = (detail: string): void => {
    broken = true;
    failed = true;
    try { worker?.terminate(); } catch { /* already gone */ }
    worker = null;
    const all = [...pending.values()];
    pending.clear();
    for (const p of all) fallback('worker-failed', detail, p.input).then(p.resolve, p.reject);
  };

  const onMessage = (msg: FromWorker): void => {
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.t === 'done') {
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.value);
      else p.reject(new Error(msg.error));
      return;
    }
    const answer: Promise<unknown> = msg.kind === 'read'
      ? p.input.read(msg.fen, msg.source)
      : p.input.extra?.evalBoard
        ? p.input.extra.evalBoard(msg.fen)
        : Promise.reject(new Error('no evalBoard'));
    answer.then(
      (value) => worker?.postMessage({ t: 'engine-reply', call: msg.call, ok: true, value }),
      (e: unknown) => worker?.postMessage({ t: 'engine-reply', call: msg.call, ok: false, value: e instanceof Error ? e.message : String(e) }),
    );
  };

  const ensure = (): WorkerLike | null => {
    if (broken) return null;
    if (worker) return worker;
    let w: WorkerLike | null = null;
    try { w = make(); } catch { w = null; }
    if (!w) { broken = true; return null; }
    w.onmessage = (e) => onMessage(e.data);
    w.onerror = (e) => fail(e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? e));
    worker = w;
    return w;
  };

  return {
    warm(): void { ensure(); },
    read(i: BoardReadInput): Promise<BoardFactSet> {
      const w = ensure();
      if (!w) return fallback(failed ? 'worker-failed' : 'no-worker', failed ? 'the worker failed earlier this session' : 'no Worker in this environment', i);
      const { read: _read, extra, ...rest } = i;
      void _read;
      const payload: BoardReadPayload = { ...rest };
      if (extra) {
        const { evalBoard: _eval, ...plain } = extra;
        void _eval;
        payload.extra = plain;
      }
      const id = nextId++;
      return new Promise<BoardFactSet>((resolve, reject) => {
        pending.set(id, { input: i, resolve, reject });
        try {
          const data: DataMirror = mirror();
          w.postMessage({ t: 'read', id, input: payload, evalBoard: !!extra?.evalBoard, mirror: data, native: isNativeApp() });
        } catch (e) {
          pending.delete(id);
          fallback('not-cloneable', e instanceof Error ? e.message : String(e), i).then(resolve, reject);
        }
      });
    },
  };
}

let shared: BoardReadClient | null = null;

/** The app's board read: `boardReadFacts`, run in the board-read worker. */
export function boardReadOffThread(i: BoardReadInput): Promise<BoardFactSet> {
  shared ??= createBoardReadClient(browserWorker);
  return shared.read(i);
}

/** Start the board-read worker before the student taps (a "Read this
 *  position" mount): its module loads while the board is on screen, not
 *  between the tap and the first word. */
export function warmBoardReadOffThread(): void {
  shared ??= createBoardReadClient(browserWorker);
  shared.warm();
}
