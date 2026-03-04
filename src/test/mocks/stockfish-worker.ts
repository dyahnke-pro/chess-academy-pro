// Mock Stockfish worker that returns canned UCI responses

import { vi } from 'vitest';

export const mockStockfishWorker = {
  postMessage: vi.fn((command: string) => {
    if (command === 'uci') {
      mockStockfishWorker.onmessage?.({ data: 'uciok' } as MessageEvent);
    }
    if (command === 'isready') {
      mockStockfishWorker.onmessage?.({ data: 'readyok' } as MessageEvent);
    }
    if (command.startsWith('go')) {
      // Return a canned analysis
      mockStockfishWorker.onmessage?.(
        { data: 'info depth 18 multipv 1 score cp 30 pv e2e4 e7e5 g1f3 b8c6' } as MessageEvent,
      );
      mockStockfishWorker.onmessage?.(
        { data: 'info depth 18 multipv 2 score cp 20 pv d2d4 d7d5 c2c4' } as MessageEvent,
      );
      mockStockfishWorker.onmessage?.(
        { data: 'bestmove e2e4 ponder e7e5' } as MessageEvent,
      );
    }
  }),
  terminate: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((error: ErrorEvent) => void) | null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
