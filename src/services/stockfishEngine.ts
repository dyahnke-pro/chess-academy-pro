import type { StockfishAnalysis, AnalysisLine } from '../types';

type StockfishMessageHandler = (analysis: StockfishAnalysis) => void;

interface PendingAnalysis {
  resolve: (analysis: StockfishAnalysis) => void;
  reject: (error: Error) => void;
  lines: Map<number, AnalysisLine>;
  bestMove: string;
  depth: number;
}

function createStockfishWorker(): Worker {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile || !hasSharedArrayBuffer) {
    return new Worker(
      new URL('../../node_modules/stockfish/bin/stockfish-18-single.js', import.meta.url),
    );
  }
  return new Worker(
    new URL('../../node_modules/stockfish/bin/stockfish-18.js', import.meta.url),
  );
}

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private pending: PendingAnalysis | null = null;
  private messageHandlers: Set<StockfishMessageHandler> = new Set();
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = createStockfishWorker();

        this.worker.onmessage = (event: MessageEvent<string>) => {
          this.handleMessage(event.data);
        };

        this.worker.onerror = (error) => {
          reject(new Error(`Stockfish worker error: ${error.message}`));
        };

        // Wait for readyok
        const readyHandler = (event: MessageEvent<string>): void => {
          if (event.data === 'readyok') {
            this.worker?.removeEventListener('message', readyHandler);
            this.isReady = true;
            this.send('setoption name MultiPV value 3');
            resolve();
          }
        };

        this.worker.addEventListener('message', readyHandler);
        this.send('uci');
        this.send('isready');
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
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
