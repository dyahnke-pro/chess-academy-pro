/**
 * take_back_move — REAL (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Reverts the board by `count` half-moves via the surface-supplied
 * `onTakeBackMove` callback. Most chat surfaces wire this to the
 * existing take-back machinery (rewind N plies, replay none).
 *
 * Note: The intent router (Layer 1, in `coachIntentRouter.ts`)
 * catches "take that back" / "undo" patterns BEFORE the LLM and
 * dispatches via this tool's surface callback directly. This tool
 * definition is here so the LLM can ALSO emit it explicitly when
 * context demands (e.g., "let me try the Sicilian instead — undo my
 * e4").
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const takeBackMoveTool: Tool = {
  name: 'take_back_move',
  category: 'cerebrum',
  description:
    "Revert the board by N half-moves. count=1 undoes the user's last move. count=2 undoes the whole exchange. REQUIRED whenever you say you'll take a move back; saying it without calling this means the move did not get taken back.",
  parameters: {
    type: 'object',
    properties: {
      count: {
        type: 'number',
        description: 'Number of half-moves to revert. Default 1.',
      },
    },
    required: [],
  },
  async execute(args, ctx) {
    const rawCount = typeof args.count === 'number' ? args.count : 1;
    const count = Math.max(1, Math.floor(rawCount));

    if (!ctx?.onTakeBackMove) {
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'takeBackMoveTool',
        summary: `take_back_move count=${count} — no callback wired`,
      });
      return { ok: false, error: 'no onTakeBackMove callback wired' };
    }

    try {
      const result = await Promise.resolve(ctx.onTakeBackMove(count));
      const ok = typeof result === 'boolean' ? result : result.ok;
      const reason =
        typeof result === 'object' && 'reason' in result ? result.reason : undefined;
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'takeBackMoveTool',
        summary: `take_back_move count=${count} ${ok ? 'ok' : 'rejected'}`,
        details: reason ? `reason=${reason}` : undefined,
        fen: ctx.liveFen,
      });
      return ok
        ? { ok: true, result: { count, reverted: true } }
        : { ok: false, error: reason ?? 'surface rejected take-back' };
    } catch (err) {
      return {
        ok: false,
        error: `onTakeBackMove threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
