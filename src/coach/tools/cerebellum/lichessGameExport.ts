/**
 * lichess_game_export — fetch a single master game's PGN by Lichess
 * game ID. The id is typically sourced from
 * `lichess_master_games.topGames[].id` after the coach has shown
 * master frequencies for a position. Lets the coach walk the user
 * through a famous game move-by-move when teaching an opening.
 *
 * Used in the "guided opening tour" loop:
 *   1. lichess_master_games at the starting FEN → top moves + top games
 *   2. Coach picks a game (by player, ECO, or freshness)
 *   3. lichess_game_export(id) → full PGN
 *   4. start_walkthrough_for_opening (cerebrum) → opens the playback UI
 */
import { fetchLichessGameExport } from '../../../services/lichessExplorerService';
import type { Tool } from '../../types';

export const lichessGameExportTool: Tool = {
  name: 'lichess_game_export',
  category: 'cerebellum',
  kind: 'read',
  description:
    "Fetch the full PGN of a single master game by Lichess game ID (typically from `lichess_master_games.topGames[].id`). Returns the PGN string verbatim — headers + moves. Use this when teaching an opening to walk the student through how a titled player handled the same position.",
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description:
          "Lichess 8-char base62 game id (e.g. 'aB3xY7zQ'). Sourced from `lichess_master_games.topGames[].id`.",
      },
    },
    required: ['id'],
  },
  async execute(args) {
    const id = typeof args.id === 'string' ? args.id : '';
    if (!id.trim()) return { ok: false, error: 'id is required' };
    try {
      const pgn = await fetchLichessGameExport(id);
      return {
        ok: true,
        result: {
          id,
          pgn,
          // Length hint so the LLM can preview / truncate without
          // re-parsing the whole PGN.
          length: pgn.length,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
