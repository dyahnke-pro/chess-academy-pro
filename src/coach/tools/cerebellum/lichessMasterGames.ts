/**
 * lichess_master_games — fetch master-game stats for the given FEN
 * via the Lichess Explorer's `masters` source. Returns frequency
 * data so the coach can answer "how do strong players treat this
 * position?" with grounded numbers.
 */
import { fetchLichessExplorer } from '../../../services/lichessExplorerService';
import type { Tool } from '../../types';

export const lichessMasterGamesTool: Tool = {
  name: 'lichess_master_games',
  category: 'cerebellum',
  kind: 'read',
  description: 'Master-database stats for a FEN: top moves played by titled players, their frequency, and sample top games when available.',
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
      const explorer = await fetchLichessExplorer(fen, 'masters');
      const topMoves = explorer.moves.slice(0, 5).map((m) => {
        const total = m.white + m.draws + m.black;
        return {
          san: m.san,
          total,
          averageRating: m.averageRating,
        };
      });
      const topGames = explorer.topGames.slice(0, 3);
      return {
        ok: true,
        result: {
          eco: explorer.opening?.eco ?? null,
          name: explorer.opening?.name ?? null,
          topMoves,
          topGames,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
