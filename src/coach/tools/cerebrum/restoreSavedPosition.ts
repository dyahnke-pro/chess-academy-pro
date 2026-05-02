/**
 * restore_saved_position — read the saved FEN from coach memory and
 * jump the live board to it. Two slots:
 *   1. `savedPosition` (explicit) — set by `save_position` tool.
 *   2. `autoSavedPosition` (auto) — set by the surface on every move
 *      so a sudden app exit still leaves the live FEN recoverable.
 * Prefers the explicit save; falls back to the auto-save when no
 * explicit save exists. Returns `{ ok: false, error }` when neither
 * slot is populated so the brain can tell the student "nothing saved
 * yet" rather than silently doing nothing.
 */
import type { Tool } from '../../types';
import { memoryReadSavedPosition } from '../../sources/memory';
import { logAppAudit } from '../../../services/appAuditor';

export const restoreSavedPositionTool: Tool = {
  name: 'restore_saved_position',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Restore the saved FEN onto the live board. Use this when the student says \"resume,\" \"go back to where I was,\" \"the position I saved,\" or returns to /coach/teach after stepping away. The tool reads from memory and calls set_board_position internally — you don't need to pass the FEN.",
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args, ctx) {
    const saved = memoryReadSavedPosition();
    if (!saved) {
      return { ok: false, error: 'No saved position in memory. Tell the student there is nothing to restore yet.' };
    }
    if (!ctx?.onSetBoardPosition) {
      return {
        ok: true,
        result: {
          stub: true,
          requested: saved,
          reason: 'no onSetBoardPosition callback on this surface',
        },
      };
    }
    try {
      const result = await Promise.resolve(ctx.onSetBoardPosition(saved.fen));
      const ok = typeof result === 'boolean' ? result : result.ok;
      const reason =
        typeof result === 'object' && 'reason' in result ? result.reason : undefined;
      void logAppAudit({
        kind: 'coach-memory-position-restored',
        category: 'subsystem',
        source: 'restoreSavedPositionTool',
        summary: `restored from ${saved.source} slot (label="${saved.label ?? ''}")`,
        details: JSON.stringify({ fen: saved.fen, label: saved.label, source: saved.source, ok, reason }),
        fen: saved.fen,
      });
      return ok
        ? { ok: true, result: { fen: saved.fen, label: saved.label, source: saved.source } }
        : { ok: false, error: reason ?? 'surface rejected position-restore' };
    } catch (err) {
      return { ok: false, error: `restore threw: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
