/**
 * stockfish_eval — read-only deterministic position eval.
 * Wraps `stockfishEngine.queueAnalysis` so it serializes against
 * any other engine work (live-play move selection, narration, etc.)
 * without cancelling them.
 */
import { stockfishEngine } from '../../../services/stockfishEngine';
import type { Tool } from '../../types';

export const stockfishEvalTool: Tool = {
  name: 'stockfish_eval',
  category: 'cerebellum',
  kind: 'read',
  description: 'Run Stockfish on a FEN at a chosen depth. Returns centipawn eval, best move, and the top principal variation. Read-only — does not change the game state.',
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN to analyze.' },
      depth: { type: 'number', description: 'Search depth (default 12). Use 16+ for serious analysis, 10 for fast checks.' },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    const depth = typeof args.depth === 'number' ? args.depth : 12;
    if (!fen.trim()) {
      return { ok: false, error: 'fen is required' };
    }
    try {
      const analysis = await stockfishEngine.queueAnalysis(fen, depth);
      return {
        ok: true,
        result: {
          bestMove: analysis.bestMove,
          evaluation: analysis.evaluation,
          isMate: analysis.isMate,
          mateIn: analysis.mateIn,
          depth: analysis.depth,
          topLines: analysis.topLines.slice(0, 3),
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
