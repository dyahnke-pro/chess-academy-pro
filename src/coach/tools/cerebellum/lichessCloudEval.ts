/**
 * lichess_cloud_eval — fetch Lichess's cached deep eval for a FEN.
 *
 * Lichess Cloud Eval is a public service that returns precomputed
 * Stockfish analysis (typically depth 30+, multi-PV) for popular
 * positions. Hits are common in opening + middle-game positions and
 * give the brain dramatically deeper data than the local Stockfish
 * (capped at depth ~12-18 by latency budgets).
 *
 * Returns null result when the position isn't in Lichess's cloud
 * (404 from upstream). Caller should fall back to `stockfish_eval`
 * for an on-device computation in that case.
 *
 * No auth required.
 */
import { fetchCloudEval } from '../../../services/lichessExplorerService';
import type { Tool } from '../../types';

export const lichessCloudEvalTool: Tool = {
  name: 'lichess_cloud_eval',
  category: 'cerebellum',
  kind: 'read',
  description:
    "Fetch Lichess's deep cloud eval for a FEN — typically depth 30+ with multi-PV lines. Faster and deeper than the local Stockfish for positions Lichess has cached. Returns null when the position isn't in the cloud (caller should fall back to stockfish_eval).",
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN.' },
      multiPv: {
        type: 'number',
        description: 'How many principal variations to request (1-5). Defaults to 3.',
      },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    if (!fen.trim()) return { ok: false, error: 'fen is required' };
    const rawMulti = typeof args.multiPv === 'number' ? args.multiPv : 3;
    const multiPv = Math.max(1, Math.min(5, Math.floor(rawMulti)));

    try {
      const cloud = await fetchCloudEval(fen, multiPv);
      if (!cloud) {
        return {
          ok: true,
          result: {
            cached: false,
            note: 'Position not in Lichess cloud — call stockfish_eval for on-device analysis.',
          },
        };
      }
      // Best line = pvs[0]. Extract its evaluation in centipawns and
      // shape the lines so the LLM sees the same structure as
      // stockfish_eval (moves[], evaluation, mate). pvs[].moves is a
      // space-separated UCI string from upstream — split it so the
      // brain doesn't have to.
      const lines = cloud.pvs.map((pv) => ({
        moves: pv.moves.split(/\s+/).filter(Boolean),
        evaluation: typeof pv.cp === 'number' ? pv.cp : null,
        mate: typeof pv.mate === 'number' ? pv.mate : null,
      }));
      const best = lines[0];
      return {
        ok: true,
        result: {
          cached: true,
          depth: cloud.depth,
          knodes: cloud.knodes,
          bestMoveUci: best?.moves[0] ?? null,
          evaluation: best?.evaluation ?? null,
          mate: best?.mate ?? null,
          lines,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
