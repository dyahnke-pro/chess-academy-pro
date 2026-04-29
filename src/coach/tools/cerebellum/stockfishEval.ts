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
  async execute(args, ctx) {
    // WO-CYCLE7-FOLLOWUPS — fall back to the live FEN when the brain
    // emits stockfish_eval without supplying one. Cycle 7 audit
    // Finding 87 caught the brain calling stockfish_eval() with no
    // args; the previous shape returned `fen is required` and the
    // brain had to retry with a roundtrip. Now the spine fills the
    // gap: the call still gets the live position evaluated, just
    // with a synthetic-arg note so triage can spot the brain's
    // omission in the audit log.
    const argFen = typeof args.fen === 'string' ? args.fen.trim() : '';
    const fen = argFen || (ctx?.liveFen ?? '');
    const depth = typeof args.depth === 'number' ? args.depth : 12;
    if (!fen) {
      return { ok: false, error: 'fen is required (no liveFen available either)' };
    }
    const usedLiveFen = !argFen && fen === ctx?.liveFen;
    try {
      // WO-STOCKFISH-SWAP-AND-PERF (part 5): brain-facing eval
      // budgets at 300ms. If the search hasn't returned by then,
      // Stockfish is forced to emit bestmove from its current best
      // line (sent via `stop`), and we return what it had. Direct
      // engine callers (post-game review, hint system) keep using
      // queueAnalysis / analyzePosition without a budget.
      const analysis = await stockfishEngine.analyzeWithBudget(fen, depth, 300);
      return {
        ok: true,
        result: {
          bestMove: analysis.bestMove,
          evaluation: analysis.evaluation,
          isMate: analysis.isMate,
          mateIn: analysis.mateIn,
          depth: analysis.depth,
          topLines: analysis.topLines.slice(0, 3),
          ...(usedLiveFen
            ? { note: 'fen arg was missing; analyzed live board FEN instead' }
            : {}),
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
