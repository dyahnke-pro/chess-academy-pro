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

    if (!ctx?.onResetBoard) {
      // 🔒 NO FAKE SUCCESS (David 2026-09-08): don't claim the board was reset on
      // a surface that has none. Return ok:false so the coach tells the truth.
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'resetBoardTool.execute',
        summary: 'reset_board refused — no board on this surface',
      });
      return {
        ok: false,
        error: 'Cannot reset the board here — there is no active board on this surface.',
      };
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
