/**
 * record_hint_request — log a hint tap to memory. Fully implemented.
 * Used by the brain when surfaces want to log hint behaviour without
 * importing UNIFY-01's store directly.
 */
import type { Tool } from '../../types';
import { memoryRecordHintRequest } from '../../sources/memory';

export const recordHintRequestTool: Tool = {
  name: 'record_hint_request',
  category: 'cerebrum',
  description: 'Log a hint request to coach memory. Captures position, tier, best move, and game id so cross-game patterns can surface later.',
  parameters: {
    type: 'object',
    properties: {
      gameId: { type: 'string', description: 'Game id (or empty string if not in a game).' },
      moveNumber: { type: 'number', description: 'Half-move ply count.' },
      ply: { type: 'number', description: 'Half-move ply count.' },
      fen: { type: 'string', description: 'Position FEN at hint request.' },
      bestMoveUci: { type: 'string', description: 'Engine\'s best move in UCI.' },
      bestMoveSan: { type: 'string', description: 'Engine\'s best move in SAN.' },
      tier: { type: 'number', description: 'Hint tier (1, 2, or 3).' },
    },
    required: ['fen', 'bestMoveUci', 'bestMoveSan', 'tier'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    const bestMoveUci = typeof args.bestMoveUci === 'string' ? args.bestMoveUci : '';
    const bestMoveSan = typeof args.bestMoveSan === 'string' ? args.bestMoveSan : '';
    const tier = Number(args.tier);
    if (tier !== 1 && tier !== 2 && tier !== 3) {
      return { ok: false, error: 'tier must be 1, 2, or 3' };
    }
    try {
      const result = memoryRecordHintRequest({
        gameId: typeof args.gameId === 'string' ? args.gameId : '',
        moveNumber: typeof args.moveNumber === 'number' ? args.moveNumber : 0,
        ply: typeof args.ply === 'number' ? args.ply : 0,
        fen,
        bestMoveUci,
        bestMoveSan,
        tier,
      });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
