import type { StockfishAnalysis, AnalysisLine } from '../types';
import { MATE_EVAL_VALUE } from './engineConstants';
import { stockfishCache } from './stockfishCache';
import { logAppAudit } from './appAuditor';

type StockfishMessageHandler = (analysis: StockfishAnalysis) => void;
type StockfishStatus = 'idle' | 'loading' | 'ready' | 'error';
type StatusChangeHandler = (status: StockfishStatus, error?: string) => void;

interface PendingAnalysis {
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: string;
  depth: number;
  blackToMove: boolean;
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
const WORKER_URL = '/stockfish/stockfish-18-lite.js';
const MAX_CRASH_RETRIES = 3;

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
      const timeoutId = setTimeout(() => {
        const msg = 'Stockfish initialization timed out after 45s';
        console.error('[Stockfish]', msg);
        this.setStatus('error', msg);
        reject(new Error(msg));
      }, INIT_TIMEOUT_MS);

      try {
        this.worker = new Worker(WORKER_URL);

        this.worker.onmessage = (event: MessageEvent<string>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeoutId);
          const msg =
            error.message ||
            'Uncaught RuntimeError or worker load failure';
          console.error('[Stockfish] worker.onerror:', msg);
          this.setStatus('error', msg);
          this.initPromise = null;
          reject(new Error(msg));
        };

        // Multi-threaded NNUE init flow:
        //   send `uci` → wait for `uciok` → send setoption Threads/Hash/MultiPV
        //   → send `isready` → wait for `readyok`
        // Setting Threads/Hash before isready ensures the engine
        // allocates the right TT size and worker pool before the
        // first analysis request lands.
        const threadCount =
          (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
        const hashMb = 64;

        const initHandler = (event: MessageEvent<string>): void => {
          if (event.data === 'uciok') {
            this.send(`setoption name Threads value ${threadCount}`);
            this.send(`setoption name Hash value ${hashMb}`);
            this.send('setoption name MultiPV value 3');
            console.log(
              `[Stockfish] threads=${threadCount} hash=${hashMb}MB`,
            );
            this.send('isready');
            return;
          }
          if (event.data === 'readyok') {
            clearTimeout(timeoutId);
            this.worker?.removeEventListener('message', initHandler);
            this.isReady = true;
            this._crashRetries = 0;
            console.log('[Stockfish] Engine ready (lite multi-threaded WASM)');
            this.setStatus('ready');
            resolve();
          }
        };

        this.worker.addEventListener('message', initHandler);
        this.send('uci');
      } catch (error) {
        clearTimeout(timeoutId);
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Stockfish] Init error:', msg);
        this.setStatus('error', msg);
        this.initPromise = null;
        reject(error instanceof Error ? error : new Error(msg));
      }
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

    await this.initialize();

    return new Promise((resolve, reject) => {
      // If a previous analysis is pending, stop it and wait for bestmove
      // before starting the new one
      if (this.pending) {
        const oldPending = this.pending;
        this.pending = null;
        this.send('stop');
        // Reject the old pending so callers don't hang
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
