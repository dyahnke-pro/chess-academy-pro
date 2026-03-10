import type { StockfishAnalysis, AnalysisLine } from '../types';

type StockfishMessageHandler = (analysis: StockfishAnalysis) => void;
type StockfishStatus = 'idle' | 'loading' | 'ready' | 'error';
type StatusChangeHandler = (status: StockfishStatus, error?: string) => void;

interface PendingAnalysis {
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: string;
  depth: number;
}

const INIT_TIMEOUT_MS = 45_000;

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private pending: PendingAnalysis | null = null;
  private messageHandlers: Set<StockfishMessageHandler> = new Set();
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private initPromise: Promise<void> | null = null;
  private _status: StockfishStatus = 'idle';
  private _error: string | null = null;

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
        this.worker = new Worker('/stockfish/stockfish-18-lite-single.js');

        this.worker.onmessage = (event: MessageEvent<string>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeoutId);
          const msg = `Worker failed to load: ${error.message}`;
          console.error('[Stockfish]', msg);
          this.setStatus('error', msg);
          this.initPromise = null;
          reject(new Error(msg));
        };

        // Wait for readyok
        const readyHandler = (event: MessageEvent<string>): void => {
          if (event.data === 'readyok') {
            clearTimeout(timeoutId);
            this.worker?.removeEventListener('message', readyHandler);
            this.isReady = true;
            this.send('setoption name MultiPV value 3');
            console.log('[Stockfish] Engine ready (lite-single WASM)');
            this.setStatus('ready');
            resolve();
          }
        };

        this.worker.addEventListener('message', readyHandler);
        this.send('uci');
        this.send('isready');
      } catch (error) {
        clearTimeout(timeoutId);
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Stockfish] Init error:', msg);
        this.setStatus('error', msg);
        this.initPromise = null;
        reject(error instanceof Error ? error : new Error(msg));
      }
    });

    return this.initPromise;
  }

  async analyzePosition(
    fen: string,
    depth: number = 18,
  ): Promise<StockfishAnalysis> {
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

      this.pending = {
        resolve,
        reject,
        lines: new Map(),
        bestMove: '',
        depth: 0,
      };

      this.send('ucinewgame');
      this.send('isready');

      // Wait for readyok before starting new analysis to avoid race with stop
      const readyHandler = (event: MessageEvent<string>): void => {
        if (event.data === 'readyok') {
          this.worker?.removeEventListener('message', readyHandler);
          this.send(`position fen ${fen}`);
          this.send(`go depth ${depth}`);
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

  stop(): void {
    if (this.worker && this.isReady) {
      this.send('stop');
    }
  }

  destroy(): void {
    this.stop();
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
    if (!this.pending) return;

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
          evaluation: scoreType === 'cp' ? scoreValue : (scoreValue > 0 ? 30000 : -30000),
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
      const evaluation = primaryLine?.evaluation ?? 0;
      const isMate = primaryLine?.mate !== null && primaryLine?.mate !== undefined;

      const analysis: StockfishAnalysis = {
        bestMove,
        evaluation,
        isMate,
        mateIn: primaryLine?.mate ?? null,
        depth: this.pending.depth,
        topLines,
        nodesPerSecond: 0,
      };

      this.pending.resolve(analysis);
      this.pending = null;

      this.messageHandlers.forEach((h) => h(analysis));
    }
  }
}

// Singleton
export const stockfishEngine = new StockfishEngine();
