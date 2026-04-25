/**
 * play_move — REAL (WO-BRAIN-04). Validates the requested SAN against
 * the live FEN (passed in via `ToolExecutionContext.liveFen`) and
 * invokes the surface-supplied `onPlayMove` callback to actually play
 * the move. The callback's return value (`{ ok, reason }` or boolean)
 * is surfaced back to the LLM in the next round-trip so it can react
 * to a rejected move.
 *
 * If no `onPlayMove` callback is wired (the surface didn't pass one to
 * `coachService.ask`), the tool returns an error. Tools never silently
 * succeed — the LLM should know its move didn't land.
 */
import { Chess } from 'chess.js';
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const playMoveTool: Tool = {
  name: 'play_move',
  category: 'cerebrum',
  description:
    "Make a move in the live game on the coach's behalf. Pass SAN; the move is validated against the current FEN before being played. Returns { ok, played, reason? } so you can react to a rejected move on the next turn.",
  parameters: {
    type: 'object',
    properties: {
      san: { type: 'string', description: 'Move in SAN, e.g. "Nf3" or "exd5".' },
    },
    required: ['san'],
  },
  async execute(args, ctx) {
    const san = typeof args.san === 'string' ? args.san.trim() : '';
    if (!san) return { ok: false, error: 'san is required' };

    if (!ctx?.onPlayMove) {
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'playMoveTool',
        summary: `play_move ${san} — no onPlayMove callback`,
        details:
          'The calling surface did not pass an onPlayMove callback to coachService.ask, so the move cannot be played.',
      });
      return {
        ok: false,
        error:
          'no onPlayMove callback wired — calling surface must pass one in coachService.ask options',
      };
    }

    // Validate SAN against the live FEN before invoking the surface
    // callback. If the FEN is missing (rare; surfaces that emit
    // play_move should always pass it), skip the check and let the
    // surface validate. chess.js throws on illegal SAN.
    if (ctx.liveFen) {
      try {
        const chess = new Chess(ctx.liveFen);
        // chess.js throws on illegal SAN; the catch below converts the
        // throw into a tool error.
        chess.move(san);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `chess.js rejected "${san}" from FEN ${ctx.liveFen}: ${message}`,
        };
      }
    }

    // Invoke the surface callback. Accept `boolean` or
    // `{ ok, reason }` shapes. Any thrown error becomes a tool error.
    try {
      const callbackResult = await Promise.resolve(ctx.onPlayMove(san));
      const ok =
        typeof callbackResult === 'boolean'
          ? callbackResult
          : callbackResult.ok;
      const reason =
        typeof callbackResult === 'object' && 'reason' in callbackResult
          ? callbackResult.reason
          : undefined;
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'playMoveTool',
        summary: `play_move ${san} ${ok ? 'ok' : 'rejected'}`,
        details: reason ? `reason=${reason}` : undefined,
        fen: ctx.liveFen,
      });
      return ok
        ? { ok: true, result: { san, played: true } }
        : { ok: false, error: reason ?? `surface rejected "${san}"` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `onPlayMove threw: ${message}` };
    }
  },
};
