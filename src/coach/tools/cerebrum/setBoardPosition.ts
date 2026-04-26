/**
 * set_board_position — REAL (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Jumps the board to an arbitrary FEN via the surface-supplied
 * `onSetBoardPosition` callback. Useful when the user says "show me
 * the position after move 6" or "set up the Italian after Bc4."
 */
import { Chess } from 'chess.js';
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const setBoardPositionTool: Tool = {
  name: 'set_board_position',
  category: 'cerebrum',
  description:
    "Jump the board to a specific FEN position. REQUIRED whenever you say you'll set up a position; saying it without calling this means the position did not change. The FEN must be valid; this tool validates before dispatching.",
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'FEN string for the target position.' },
    },
    required: ['fen'],
  },
  async execute(args, ctx) {
    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
    if (!fen) return { ok: false, error: 'fen is required' };

    try {
      // chess.js validates FEN on construction.
      new Chess(fen);
    } catch (err) {
      return {
        ok: false,
        error: `invalid FEN: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!ctx?.onSetBoardPosition) {
      return { ok: false, error: 'no onSetBoardPosition callback wired' };
    }

    try {
      const result = await Promise.resolve(ctx.onSetBoardPosition(fen));
      const ok = typeof result === 'boolean' ? result : result.ok;
      const reason =
        typeof result === 'object' && 'reason' in result ? result.reason : undefined;
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'setBoardPositionTool',
        summary: `set_board_position ${ok ? 'ok' : 'rejected'}`,
        details: reason ? `reason=${reason}` : undefined,
        fen,
      });
      return ok
        ? { ok: true, result: { fen } }
        : { ok: false, error: reason ?? 'surface rejected position-set' };
    } catch (err) {
      return {
        ok: false,
        error: `onSetBoardPosition threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
