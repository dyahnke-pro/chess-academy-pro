import type { StockfishAnalysis, AnalysisLine } from '../types';
import { MATE_EVAL_VALUE } from './engineConstants';
import { stockfishCache } from './stockfishCache';
import { logAppAudit } from './appAuditor';

type StockfishMessageHandler = (analysis: StockfishAnalysis) => void;
type StockfishStatus = 'idle' | 'loading' | 'ready' | 'error';
type StatusChangeHandler = (status: StockfishStatus, error?: string) => void;

export type AnalysisPriority = 'brain' | 'prefetch';

/** Surface error thrown when a `priority='prefetch'` analysis is
 *  dropped because a `priority='brain'` analysis is already in flight.
 *  Callers (the speculative-prefetch path) should catch and ignore. */
export class PrefetchDroppedError extends Error {
  constructor() {
    super('prefetch dropped: brain eval in flight');
    this.name = 'PrefetchDroppedError';
  }
}

interface PendingAnalysis {
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: string;
  depth: number;
  blackToMove: boolean;
  /** Caller's priority. Used by `analyzePosition`'s contention rules:
   *  brain calls preempt prefetch; prefetch is dropped when a brain
   *  eval is already in flight; brain-on-brain serializes via the
   *  brain mutex instead of cancelling. */
  priority: AnalysisPriority;
  /** FEN + requested depth, captured so the bestmove handler can
   *  populate the LRU cache once analysis completes. Skipped when
   *  the call carried per-analysis options (Skill Level, etc.). */
  cacheFen?: string;
  cacheDepth?: number;
}

interface QueueEntry {
  fen: string;
  depth: number;
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
}

const INIT_TIMEOUT_MS = 45_000;
const STOCKFISH_MT_URL = '/stockfish/stockfish-18-lite.js';
const STOCKFISH_ST_URL = '/stockfish/stockfish-18-lite-single.js';
const MAX_CRASH_RETRIES = 3;
/** How long to wait after spawning the multi-threaded worker before
 *  declaring it broken. The bundle hangs / throws inside pthread
 *  spawn very quickly when the host environment can't actually run
 *  it, so 5s is enough to catch real failures while still allowing
 *  slow first-load WASM compilation to finish. */
const MT_EARLY_FAILURE_WINDOW_MS = 5_000;

export type StockfishVariant = 'multi' | 'single';

export interface ResolvedWorker {
  url: string;
  variant: StockfishVariant;
  reason: string;
}

export function resolveWorkerUrl(): ResolvedWorker {
  if (typeof window === 'undefined') {
    return { url: STOCKFISH_ST_URL, variant: 'single', reason: 'no-window' };
  }
  const isolated =
    (window as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  const sabAvailable = typeof SharedArrayBuffer !== 'undefined';
  if (isolated && sabAvailable) {
    return {
      url: STOCKFISH_MT_URL,
      variant: 'multi',
      reason: 'crossOriginIsolated + SharedArrayBuffer available',
    };
  }
  return {
    url: STOCKFISH_ST_URL,
    variant: 'single',
    reason: `multi-thread requirements not met (crossOriginIsolated=${isolated}, SharedArrayBuffer=${sabAvailable})`,
  };
}

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private pending: PendingAnalysis | null = null;
  private messageHandlers: Set<StockfishMessageHandler> = new Set();
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private initPromise: Promise<void> | null = null;
  private _status: StockfishStatus = 'idle';
  private _error: string | null = null;
  // Analysis queue — serializes requests so they don't cancel each other
  private _queue: QueueEntry[] = [];
  private _queueRunning = false;
  // Gate to ignore stale bestmove/info from a stopped analysis
  private _analysisStarted = false;
  // Worker-crash retry counter; resets on successful initialize.
  private _crashRetries = 0;
  // Set true once the engine has surfaced "engine unavailable" so we
  // don't keep trying to reinit on every analyze call.
  private _permanentlyUnavailable = false;
  // Which Stockfish bundle the current worker was spawned from. Used
  // to gate multi-thread-only setoptions during the init handshake.
  private workerVariant: StockfishVariant = 'single';
  // Serialization chain for brain-priority analyses. Each new brain
  // call appends a fresh promise; the previous one is awaited before
  // the new call enters its handshake. Prefetch calls bypass the
  // mutex (they are dropped when a brain is in flight, or supersede
  // an in-flight prefetch).
  private _brainMutex: Promise<void> = Promise.resolve();
  // Sticky once the multi-thread bundle has failed at runtime in
  // this app session. Capped at one fallback attempt — once true,
  // every subsequent initialize() call goes straight to the single-
  // threaded variant without probing multi again. Prevents a
  // multi → single → multi → single oscillation across crash retries.
  private _runtimeFallbackAttempted = false;

  get status(): StockfishStatus {
    return this._status;
  }

  get error(): string | null {
    return this._error;
  }

  private setStatus(status: StockfishStatus, error?: string): void {
    this._status = status;
    this._error = error ?? null;
    this.statusHandlers.forEach((h) => h(status, error));
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  async initialize(): Promise<void> {
    if (this._permanentlyUnavailable) {
      throw new Error('Stockfish engine unavailable (exhausted crash retries)');
    }
    if (this.initPromise) return this.initPromise;

    this.setStatus('loading');
    console.log('[Stockfish] Initializing worker...');

    this.initPromise = new Promise((resolve, reject) => {
      const overallTimeoutId = setTimeout(() => {
        const msg = 'Stockfish initialization timed out after 45s';
        console.error('[Stockfish]', msg);
        this.setStatus('error', msg);
        reject(new Error(msg));
      }, INIT_TIMEOUT_MS);

      const threadCount =
        (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
      const hashMb = 64;

      // Track the early-failure timer for the multi-thread variant so
      // we can clear it once uciok is received OR when fallback runs.
      let earlyFailureTimer: ReturnType<typeof setTimeout> | null = null;

      const tryStart = (forceSingle: boolean): void => {
        let resolved: ResolvedWorker;
        if (forceSingle) {
          resolved = {
            url: STOCKFISH_ST_URL,
            variant: 'single',
            reason: 'runtime fallback after multi-thread bundle failure',
          };
        } else if (this._runtimeFallbackAttempted) {
          // Sticky: a previous initialize() in this session already
          // discovered that multi-thread is broken on this host. Skip
          // probing it again.
          resolved = {
            url: STOCKFISH_ST_URL,
            variant: 'single',
            reason: 'sticky fallback (multi previously failed at runtime)',
          };
        } else {
          resolved = resolveWorkerUrl();
        }

        this.workerVariant = resolved.variant;
        console.log(
          `[Stockfish] Using ${resolved.variant}-threaded variant: ${resolved.reason}`,
        );
        void logAppAudit({
          kind: 'stockfish-variant-resolved',
          category: 'subsystem',
          source: 'stockfishEngine.initialize',
          summary: `variant=${resolved.variant} reason=${resolved.reason}`,
        });

        // Fallback is only meaningful for the multi-thread variant; if
        // we're already on single, a failure is a real init failure.
        const handleEarlyMultiFailure = (reason: string): void => {
          if (this.workerVariant !== 'multi') return;
          if (this._runtimeFallbackAttempted) return;
          this._runtimeFallbackAttempted = true;
          if (earlyFailureTimer !== null) {
            clearTimeout(earlyFailureTimer);
            earlyFailureTimer = null;
          }
          console.warn(
            '[Stockfish] Multi-thread variant failed at runtime, falling back to single-threaded',
          );
          void logAppAudit({
            kind: 'stockfish-variant-fallback',
            category: 'subsystem',
            source: 'stockfishEngine.initialize',
            summary: `multi failed at runtime, fell back to single (reason: ${reason})`,
          });
          this.worker?.terminate();
          this.worker = null;
          tryStart(true);
        };

        try {
          this.worker = new Worker(resolved.url);

          this.worker.onmessage = (event: MessageEvent<string>) => {
            this.handleMessage(event.data);
          };

          this.worker.onerror = (error) => {
            const msg =
              error.message ||
              'Uncaught RuntimeError or worker load failure';
            console.error('[Stockfish] worker.onerror:', msg);
            // Multi-thread bundle failed early — try the runtime
            // fallback before treating this as a fatal init error.
            if (
              this.workerVariant === 'multi' &&
              !this._runtimeFallbackAttempted
            ) {
              handleEarlyMultiFailure(msg);
              return;
            }
            clearTimeout(overallTimeoutId);
            if (earlyFailureTimer !== null) {
              clearTimeout(earlyFailureTimer);
              earlyFailureTimer = null;
            }
            this.setStatus('error', msg);
            this.initPromise = null;
            reject(new Error(msg));
          };

          // 5-second early-failure window. If multi-thread doesn't
          // reach `uciok` in that time, the bundle is hung in pthread
          // spawn — fall back instead of waiting for the 45s overall
          // timeout. Single-threaded init has no early window; it
          // either initializes within 45s or it doesn't.
          if (resolved.variant === 'multi') {
            earlyFailureTimer = setTimeout(() => {
              handleEarlyMultiFailure('no uciok within 5s of spawn');
            }, MT_EARLY_FAILURE_WINDOW_MS);
          }

          const initHandler = (event: MessageEvent<string>): void => {
            if (event.data === 'uciok') {
              // uciok received — multi is past the danger zone.
              if (earlyFailureTimer !== null) {
                clearTimeout(earlyFailureTimer);
                earlyFailureTimer = null;
              }
              if (this.workerVariant === 'multi') {
                this.send(`setoption name Threads value ${threadCount}`);
                this.send(`setoption name Hash value ${hashMb}`);
                console.log(
                  `[Stockfish] threads=${threadCount} hash=${hashMb}MB`,
                );
              } else {
                console.log(
                  '[Stockfish] single-threaded variant — skipping Threads/Hash setup',
                );
              }
              this.send('setoption name MultiPV value 3');
              this.send('isready');
              return;
            }
            if (event.data === 'readyok') {
              clearTimeout(overallTimeoutId);
              this.worker?.removeEventListener('message', initHandler);
              this.isReady = true;
              this._crashRetries = 0;
              console.log(
                `[Stockfish] Engine ready (${this.workerVariant}-threaded WASM)`,
              );
              this.setStatus('ready');
              resolve();
            }
          };

          this.worker.addEventListener('message', initHandler);
          this.send('uci');
        } catch (error) {
          // Synchronous throw during worker construction (rare, e.g.
          // the worker URL itself is malformed). Multi-thread gets
          // the runtime-fallback chance; single-thread cannot.
          if (
            this.workerVariant === 'multi' &&
            !this._runtimeFallbackAttempted
          ) {
            handleEarlyMultiFailure(
              error instanceof Error ? error.message : String(error),
            );
            return;
          }
          clearTimeout(overallTimeoutId);
          if (earlyFailureTimer !== null) {
            clearTimeout(earlyFailureTimer);
            earlyFailureTimer = null;
          }
          const msg = error instanceof Error ? error.message : String(error);
          console.error('[Stockfish] Init error:', msg);
          this.setStatus('error', msg);
          this.initPromise = null;
          reject(error instanceof Error ? error : new Error(msg));
        }
      };

      tryStart(false);
    });

    return this.initPromise.catch((err) => {
      // Surface init failures as crash events so the retry path can run.
      this.handleWorkerCrash(err instanceof Error ? err.message : String(err));
      throw err;
    });
  }

  /**
   * Wipe the broken worker and try once more, up to MAX_CRASH_RETRIES.
   * After the cap, mark the engine permanently unavailable so callers
   * (the brain, post-game review, hint system) can degrade gracefully.
   */
  private handleWorkerCrash(reason: string): void {
    this._crashRetries += 1;
    console.error(
      `[Stockfish] Worker crashed (attempt ${this._crashRetries}/${MAX_CRASH_RETRIES}): ${reason}`,
    );
    if (this.pending) {
      this.pending.reject(new Error(`worker crashed: ${reason}`));
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    if (this._crashRetries >= MAX_CRASH_RETRIES) {
      this._permanentlyUnavailable = true;
      this.setStatus(
        'error',
        'engine unavailable, coaching from position only',
      );
      // Reject every queued analysis so no caller hangs forever.
      for (const entry of this._queue) {
        entry.reject(new Error('engine unavailable'));
      }
      this._queue = [];
      this._queueRunning = false;
      return;
    }
    console.log('[Stockfish] Worker crashed, reinitializing...');
    // Don't await — let the next analyze call drive reinit naturally.
  }

  async analyzePosition(
    fen: string,
    depth: number = 18,
    options?: Record<string, string | number>,
    priority: AnalysisPriority = 'brain',
  ): Promise<StockfishAnalysis> {
    // FEN cache short-circuit — if we've already analyzed this exact
    // position+depth, return the cached result without invoking the
    // worker. Per-analysis `options` (e.g. Skill Level overrides) are
    // intentionally NOT part of the key — those callers should bypass
    // by passing a cache-skip sentinel if needed. Today only the brain
    // and prefetch path call without options.
    if (!options) {
      const hit = stockfishCache.get(fen, depth);
      if (hit) {
        void logAppAudit({
          kind: 'stockfish-cache-hit',
          category: 'subsystem',
          source: 'stockfishCache',
          summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
        });
        return hit;
      }
      void logAppAudit({
        kind: 'stockfish-cache-miss',
        category: 'subsystem',
        source: 'stockfishCache',
        summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
      });
    }

    // Priority contention rules:
    //   1. Incoming brain call cancels any in-flight prefetch.
    //   2. Incoming prefetch is DROPPED if a brain call is in flight
    //      (real coaching work must not be preempted by speculative
    //      warming).
    //   3. Brain-on-brain serializes via `_brainMutex` — the in-flight
    //      brain eval runs to completion before the new one starts,
    //      since both are providing real coaching value.
    if (priority === 'prefetch' && this.pending?.priority === 'brain') {
      throw new PrefetchDroppedError();
    }

    if (priority === 'brain') {
      // Append to the brain serialization chain. The previous entry
      // resolves either when the prior brain eval finishes or when it
      // fails — either way we're cleared to start. Prefetch in-flight
      // is fine; the Promise body below cancels it on entry.
      const prev = this._brainMutex;
      let release!: () => void;
      this._brainMutex = new Promise<void>((r) => {
        release = r;
      });
      try {
        await prev;
      } catch {
        /* prior brain rejected — we still proceed */
      }
      try {
        return await this._dispatchAnalysis(fen, depth, options, priority);
      } finally {
        release();
      }
    }

    return this._dispatchAnalysis(fen, depth, options, priority);
  }

  private async _dispatchAnalysis(
    fen: string,
    depth: number,
    options: Record<string, string | number> | undefined,
    priority: AnalysisPriority,
  ): Promise<StockfishAnalysis> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      // If a previous analysis is pending, stop it and wait for bestmove
      // before starting the new one. With priority gating, the only
      // remaining cases here are:
      //   - incoming brain over in-flight prefetch (cancel prefetch)
      //   - incoming prefetch over in-flight prefetch (newer move's
      //     prefetch supersedes)
      //   - incoming brain after another brain's mutex released but
      //     before this entry runs (race; cancel)
      if (this.pending) {
        const oldPending = this.pending;
        this.pending = null;
        this.send('stop');
        oldPending.reject(new Error('Analysis interrupted by new request'));
      }

      const blackToMove = fen.split(' ')[1] === 'b';

      // Mark analysis as not yet started so stale bestmove from a
      // previously-stopped analysis is ignored (see handleMessage gate).
      this._analysisStarted = false;

      this.pending = {
        resolve,
        reject,
        lines: new Map(),
        bestMove: '',
        depth: 0,
        blackToMove,
        priority,
        cacheFen: options ? undefined : fen,
        cacheDepth: options ? undefined : depth,
      };

      this.send('ucinewgame');
      this.send('isready');

      // Wait for readyok before starting new analysis to avoid race with stop
      const readyHandler = (event: MessageEvent<string>): void => {
        if (event.data === 'readyok') {
          this.worker?.removeEventListener('message', readyHandler);
          // Apply per-analysis options (e.g. Skill Level) after ucinewgame reset
          if (options) {
            for (const [key, value] of Object.entries(options)) {
              this.send(`setoption name ${key} value ${value}`);
            }
          }
          this.send(`position fen ${fen}`);
          this.send(`go depth ${depth}`);
          this._analysisStarted = true;
        }
      };
      this.worker?.addEventListener('message', readyHandler);
    });
  }

  async getBestMove(fen: string, moveTimeMs: number = 1000): Promise<string> {
    await this.initialize();

    return new Promise((resolve) => {
      const handler = (event: MessageEvent<string>): void => {
        const match = /^bestmove (\S+)/.exec(event.data);
        if (match) {
          this.worker?.removeEventListener('message', handler);
          resolve(match[1]);
        }
      };

      this.worker?.addEventListener('message', handler);
      this.send(`position fen ${fen}`);
      this.send(`go movetime ${moveTimeMs}`);
    });
  }

  /**
   * Queue an analysis request. Unlike `analyzePosition` (which cancels any
   * in-flight analysis), `queueAnalysis` serializes requests — each one waits
   * for the previous to finish before starting. Useful for background tasks
   * (e.g. coach analysis) that should not interfere with the analysis board.
   */
  queueAnalysis(fen: string, depth: number = 18): Promise<StockfishAnalysis> {
    return new Promise<StockfishAnalysis>((resolve, reject) => {
      this._queue.push({ fen, depth, resolve, reject });
      void this._drainQueue();
    });
  }

  private async _drainQueue(): Promise<void> {
    if (this._queueRunning) return;
    this._queueRunning = true;
    while (this._queue.length > 0) {
      const entry = this._queue.shift();
      if (!entry) break;
      try {
        const result = await this.analyzePosition(entry.fen, entry.depth);
        entry.resolve(result);
      } catch (err) {
        entry.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
    this._queueRunning = false;
  }

  stop(): void {
    if (this.worker && this.isReady) {
      this.send('stop');
    }
  }

  /**
   * WO-STOCKFISH-SWAP-AND-PERF (part 5): brain-facing budgeted eval.
   *
   * 1. Cache hit → return synchronously via a resolved promise.
   * 2. Cache miss → fire `analyzePosition` and start a budget timer.
   *    When the timer fires, send `stop` to Stockfish so it emits
   *    `bestmove` with whatever depth it reached. The engine's
   *    bestmove handler resolves the underlying promise normally —
   *    the budget just cuts the deepening search short.
   *
   * The budget intentionally affects the engine globally (any
   * concurrent analysis will be interrupted). Brain calls go through
   * here; UI eval calls (post-game review, hint system) keep
   * `analyzePosition` directly so they aren't budget-capped.
   */
  async analyzeWithBudget(
    fen: string,
    depth: number,
    budgetMs: number = 300,
  ): Promise<StockfishAnalysis> {
    const cached = stockfishCache.get(fen, depth);
    if (cached) {
      void logAppAudit({
        kind: 'stockfish-cache-hit',
        category: 'subsystem',
        source: 'stockfishEngine.analyzeWithBudget',
        summary: `fen=${fen.slice(0, 30)}... depth=${depth}`,
      });
      return cached;
    }
    const promise = this.analyzePosition(fen, depth);
    const timer = setTimeout(() => {
      // Force Stockfish to emit bestmove from current best line.
      this.stop();
    }, budgetMs);
    try {
      const result = await promise;
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  destroy(): void {
    this.stop();
    // Reject the currently running analysis, if any
    if (this.pending) {
      this.pending.reject(new Error('Engine destroyed'));
      this.pending = null;
    }
    // Reject all queued analyses
    for (const entry of this._queue) {
      entry.reject(new Error('Engine destroyed'));
    }
    this._queue = [];
    this._queueRunning = false;
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
    this.initPromise = null;
    this.setStatus('idle');
  }

  onAnalysis(handler: StockfishMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private handleMessage(data: string): void {
    if (!this.pending || !this._analysisStarted) return;

    // Parse info lines (MultiPV)
    const infoMatch = /^info /.exec(data);
    if (infoMatch) {
      const multipvMatch = /multipv (\d+)/.exec(data);
      const depthMatch = /depth (\d+)/.exec(data);
      const scoreMatch = /score (cp|mate) (-?\d+)/.exec(data);
      const pvMatch = / pv (.+)$/.exec(data);

      if (multipvMatch && depthMatch && scoreMatch && pvMatch) {
        const rank = parseInt(multipvMatch[1]);
        const depth = parseInt(depthMatch[1]);
        const scoreType = scoreMatch[1];
        const scoreValue = parseInt(scoreMatch[2]);
        const moves = pvMatch[1].trim().split(' ');

        this.pending.depth = depth;

        const line: AnalysisLine = {
          rank,
          evaluation: scoreType === 'cp' ? scoreValue : (scoreValue > 0 ? MATE_EVAL_VALUE : -MATE_EVAL_VALUE),
          moves,
          mate: scoreType === 'mate' ? scoreValue : null,
        };

        this.pending.lines.set(rank, line);
      }
    }

    // Best move signal
    const bestMoveMatch = /^bestmove (\S+)/.exec(data);
    if (bestMoveMatch) {
      const bestMove = bestMoveMatch[1];
      const topLines = Array.from(this.pending.lines.values())
        .sort((a, b) => a.rank - b.rank);

      // Cast to include undefined — TypeScript omits it without noUncheckedIndexedAccess
      const primaryLine = topLines[0] as AnalysisLine | undefined;
      // Stockfish returns score from side-to-move's perspective; normalize to white's perspective
      const flip = this.pending.blackToMove ? -1 : 1;
      const evaluation = (primaryLine?.evaluation ?? 0) * flip;
      const isMate = primaryLine?.mate !== null && primaryLine?.mate !== undefined;
      const mateIn = primaryLine?.mate !== null && primaryLine?.mate !== undefined
        ? primaryLine.mate * flip
        : null;

      // Normalize all lines to white's perspective
      const normalizedLines = topLines.map((line) => ({
        ...line,
        evaluation: line.evaluation * flip,
        mate: line.mate !== null ? line.mate * flip : null,
      }));

      const analysis: StockfishAnalysis = {
        bestMove,
        evaluation,
        isMate,
        mateIn,
        depth: this.pending.depth,
        topLines: normalizedLines,
        nodesPerSecond: 0,
      };

      if (this.pending.cacheFen !== undefined && this.pending.cacheDepth !== undefined) {
        stockfishCache.set(this.pending.cacheFen, this.pending.cacheDepth, analysis);
      }

      this.pending.resolve(analysis);
      this.pending = null;

      this.messageHandlers.forEach((h) => h(analysis));
    }
  }
}

// Singleton
export const stockfishEngine = new StockfishEngine();
