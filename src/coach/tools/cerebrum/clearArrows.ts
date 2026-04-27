/**
 * clear_arrows — wipes any coach-drawn arrows from the active board.
 * WO-COACH-ARROWS.
 *
 * Rarely needed in practice — boards auto-clear coach arrows when the
 * user moves (via the lastMove subscription in `useArrowState`). This
 * tool exists for the case where the brain wants to change topic
 * mid-explanation without waiting for a move (e.g. "actually let me
 * back up — the threat I was about to describe doesn't exist here").
 *
 * Graceful no-op when `onClearArrows` callback is missing.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const clearArrowsTool: Tool = {
  name: 'clear_arrows',
  category: 'cerebrum',
  kind: 'read',
  description:
    'Manually clear all arrows from the board. Rarely needed — arrows auto-clear when the user moves. Use only when changing topic mid-explanation.',
  parameters: { type: 'object', properties: {}, required: [] },
  async execute(_args, ctx) {
    if (!ctx?.onClearArrows) {
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'clearArrowsTool.execute',
        summary: 'STUB clear_arrows (no onClearArrows callback)',
      });
      return {
        ok: true,
        result: {
          stub: true,
          reason: 'no onClearArrows callback on this surface',
        },
      };
    }

    try {
      ctx.onClearArrows();
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'clearArrowsTool',
        summary: 'clear_arrows ok',
      });
      return { ok: true, result: { cleared: true } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `onClearArrows threw: ${message}` };
    }
  },
};
