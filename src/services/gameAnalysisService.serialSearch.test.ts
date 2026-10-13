// chesscom-1040709576 (2026-10-13): the sacrifice ledger ran its "take" and
// "decline" restricted searches with Promise.all on ONE pool worker. Both
// searches listened to the same message stream and came back with the same
// move — "if they take with Nxe4 or decline with Nxe4". A worker runs one
// search at a time.
import { describe, it, expect, vi, beforeEach } from 'vitest';

class FakeWorker {
  private listeners: ((e: MessageEvent<string>) => void)[] = [];
  onerror: (() => void) | null = null;
  addEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners.push(fn); }
  removeEventListener(_t: string, fn: (e: MessageEvent<string>) => void): void { this.listeners = this.listeners.filter((l) => l !== fn); }
  private emit(line: string): void { for (const l of [...this.listeners]) l({ data: line } as MessageEvent<string>); }
  postMessage(msg: string): void {
    if (msg === 'uci') setTimeout(() => this.emit('uciok'), 0);
    if (msg === 'isready') setTimeout(() => this.emit('readyok'), 0);
    const go = /^go .*searchmoves (\S+)/.exec(msg);
    if (go) {
      const mv = go[1];
      setTimeout(() => {
        this.emit(`info depth 12 multipv 1 score cp 10 pv ${mv}`);
        this.emit(`bestmove ${mv}`);
      }, 5);
    }
  }
  terminate(): void { /* no-op */ }
}

describe('one search at a time per pool worker', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('navigator', { hardwareConcurrency: 4 });
    vi.resetModules();
  });

  it('two restricted searches in flight on one worker each get their own move', async () => {
    const m = await import('./gameAnalysisService');
    m.__testables.resetAnalysisPool();
    const lease = await m.acquirePvEngines(1);
    expect(lease).not.toBeNull();
    const eng = lease!.engines[0];
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const [a, b] = await Promise.all([eng.bestOf(fen, ['b1c3'], 12), eng.bestOf(fen, ['g1f3'], 12)]);
    expect(a?.moves[0]).toBe('b1c3');
    expect(b?.moves[0]).toBe('g1f3');
    lease!.release();
  }, 30_000);
});
