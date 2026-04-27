/**
 * lichess_opening_lookup — name the opening at the given FEN via the
 * Lichess Opening Explorer. Returns ECO, opening name, and the top
 * candidate moves with their popularity.
 */
import { fetchLichessExplorer } from '../../../services/lichessExplorerService';
import type { Tool } from '../../types';

export const lichessOpeningLookupTool: Tool = {
  name: 'lichess_opening_lookup',
  category: 'cerebellum',
  kind: 'read',
  description: 'Look up the opening at a given FEN. Returns ECO code, opening name, and the top candidate moves with their amateur-database frequency.',
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN.' },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    if (!fen.trim()) return { ok: false, error: 'fen is required' };
    try {
      const explorer = await fetchLichessExplorer(fen, 'lichess');
      const topMoves = explorer.moves.slice(0, 5).map((m) => {
        const total = m.white + m.draws + m.black;
        const whitePct = total > 0 ? Math.round(((m.white + m.draws * 0.5) / total) * 100) : null;
        return { san: m.san, total, whitePct };
      });
      return {
        ok: true,
        result: {
          eco: explorer.opening?.eco ?? null,
          name: explorer.opening?.name ?? null,
          topMoves,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
