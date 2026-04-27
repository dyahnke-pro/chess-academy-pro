/**
 * reset_board — REAL (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Restarts the game from the starting position. Surface-supplied
 * `onResetBoard` callback typically calls the same `handleRestart`
 * used by the in-game restart button.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const resetBoardTool: Tool = {
  name: 'reset_board',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Reset the board to the starting position and start a fresh game. REQUIRED whenever you say you'll start over, reset, or play a fresh game; words without action are failure.",
  parameters: { type: 'object', properties: {}, required: [] },
  async execute(_args, ctx) {
    // WO-FOUNDATION-02 trace harness.
     
    console.log('[TRACE-11c]', ctx?.traceId, 'resetBoardTool entered, hasCallback:', typeof ctx?.onResetBoard);
    void logAppAudit({
      kind: 'trace-tool-entered',
      category: 'subsystem',
      source: 'resetBoardTool',
      summary: `hasCallback=${typeof ctx?.onResetBoard === 'function'} traceId=${ctx?.traceId ?? 'none'}`,
    });

    if (!ctx?.onResetBoard) {
      return { ok: false, error: 'no onResetBoard callback wired' };
    }
    try {
      const result = await Promise.resolve(ctx.onResetBoard());
      const ok = typeof result === 'boolean' ? result : result.ok;
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'resetBoardTool',
        summary: `reset_board ${ok ? 'ok' : 'rejected'}`,
        fen: ctx.liveFen,
      });
      return ok
        ? { ok: true, result: { reset: true } }
        : { ok: false, error: 'surface rejected reset' };
    } catch (err) {
      return {
        ok: false,
        error: `onResetBoard threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
