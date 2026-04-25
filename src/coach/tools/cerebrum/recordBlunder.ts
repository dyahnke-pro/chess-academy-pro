/**
 * record_blunder — log a blunder pattern to memory.
 *
 * PUNT (BRAIN-01-PUNT-BLUNDER-PATTERNS): UNIFY-01 schema-defined
 * `blunderPatterns` but didn't expose a store action for it. This
 * tool appends a synthetic conversation-history entry tagged
 * `blunder` for now, so the audit trail captures the event. A
 * follow-up WO adds a dedicated `recordBlunderPattern` action +
 * cross-game aggregation.
 */
import type { Tool } from '../../types';
import { memoryAppendConversationMessage } from '../../sources/memory';

export const recordBlunderTool: Tool = {
  name: 'record_blunder',
  category: 'cerebrum',
  description: 'Log a blunder pattern to coach memory (FEN, move, classification). Used so the coach can surface recurring blunder themes across games.',
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN BEFORE the blunder.' },
      move: { type: 'string', description: 'The blunder move in SAN.' },
      classification: { type: 'string', description: 'blunder | mistake | inaccuracy', enum: ['blunder', 'mistake', 'inaccuracy'] },
      gameId: { type: 'string', description: 'Game id for cross-game queries.' },
    },
    required: ['fen', 'move', 'classification'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    const move = typeof args.move === 'string' ? args.move : '';
    const classification = typeof args.classification === 'string' ? args.classification : '';
    if (!fen || !move || !classification) {
      return { ok: false, error: 'fen, move, and classification are required' };
    }
    try {
      const id = memoryAppendConversationMessage({
        surface: 'blunder',
        role: 'coach',
        text: `[blunder pattern logged] move=${move} classification=${classification}`,
        fen,
        gameId: typeof args.gameId === 'string' ? args.gameId : '',
        trigger: null,
      });
      return { ok: true, result: { id, fen, move, classification } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
