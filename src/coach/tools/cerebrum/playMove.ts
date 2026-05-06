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

/**
 * Build a self-healing rejection feedback string. Two cases the brain
 * keeps tripping on (production audit, build cc28e2e):
 *
 *   1. Notation error — brain wrote `Qe7+` / `Bb4+` / `Qxg7#` etc. but
 *      the underlying move doesn't actually deliver check/mate.
 *      chess.js refuses to play because the annotation is false. We
 *      detect this and tell the brain explicitly: "The underlying
 *      move IS legal, but it does NOT give check. Don't annotate
 *      moves with + or # unless they truly deliver check/mate." We
 *      do NOT silently strip the suffix — that would propagate the
 *      brain's false tactical claim into the chat bubble and the
 *      [VOICE: ...] narration, telling the student a check happened
 *      that didn't.
 *
 *   2. Genuinely illegal SAN — knight that can't reach the target
 *      square, queen blocked by a piece, etc. We return the full
 *      legal-moves list at this position so the brain picks a real
 *      move on the next trip instead of guessing again.
 *
 * In either case the next trip has actionable info to converge in
 * one retry instead of burning multiple round-trips guessing.
 */
function buildPlayMoveRejectionFeedback(
  san: string,
  liveFen: string,
  rawMessage: string,
): string {
  // Case 1: notation error — strip + / # and see if the underlying
  // move is legal. If yes, return guidance about the false tactical
  // claim. If still rejected, fall through to legal-moves list.
  if (san.endsWith('+') || san.endsWith('#')) {
    const stripped = san.slice(0, -1);
    let strippedIsLegal = false;
    try {
      new Chess(liveFen).move(stripped);
      strippedIsLegal = true;
    } catch {
      strippedIsLegal = false;
    }
    if (strippedIsLegal) {
      const claim = san.endsWith('#') ? 'checkmate' : 'check';
      return (
        `chess.js rejected "${san}". The underlying move "${stripped}" IS legal, ` +
        `but it does NOT deliver ${claim}. Annotation is wrong. Do not annotate ` +
        `moves with + or # unless they truly deliver check/checkmate — false ` +
        `tactical claims mislead the student in chat + voice. Either retry ` +
        `with "${stripped}" (no suffix) if you meant the non-${claim} move, or ` +
        `pick a different move that genuinely delivers ${claim}. Also fix any ` +
        `[VOICE: ...] or chat text in your next response so it doesn't claim a ` +
        `${claim} that didn't happen.`
      );
    }
  }

  // Case 2: genuinely illegal — list the legal moves so the brain
  // picks one rather than guessing again. Capped to keep the error
  // payload reasonable; full list rarely exceeds ~40 moves.
  let legalList = '';
  try {
    const legal = new Chess(liveFen).moves();
    legalList = legal.length > 0 ? `Legal moves at this position: [${legal.join(', ')}].` : '';
  } catch {
    legalList = '';
  }
  return `chess.js rejected "${san}" from FEN ${liveFen}: ${rawMessage}.${legalList ? ' ' + legalList : ''}`;
}

export const playMoveTool: Tool = {
  name: 'play_move',
  category: 'cerebrum',
  kind: 'write',
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
    // WO-FOUNDATION-02 trace harness.
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'playMoveTool.execute',
      summary: `entered: san=${typeof args.san === 'string' ? args.san : 'undef'} hasCallback=${typeof ctx?.onPlayMove === 'function'}`,
    });

    const san = typeof args.san === 'string' ? args.san.trim() : '';
    if (!san) return { ok: false, error: 'san is required' };

    if (!ctx?.onPlayMove) {
      // Constitution: surface absence is not a failure. Match the
      // navigateToRoute stub pattern so the LLM sees ok=true and
      // continues the turn instead of apologizing for a missing
      // callback. Surfaces that genuinely need the move played (live
      // game) wire onPlayMove; surfaces that don't (walkthrough,
      // ping, phase-narration) get a synthetic ack.
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'playMoveTool.execute',
        summary: `STUB play_move ${san} (no onPlayMove callback)`,
      });
      return {
        ok: true,
        result: {
          stub: true,
          requested: { san },
          reason: 'no onPlayMove callback on this surface',
        },
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
        // throw into a tool error. chess.js also throws when a move
        // is annotated `+` or `#` but doesn't actually deliver
        // check/mate — it enforces accurate tactical notation.
        chess.move(san);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: buildPlayMoveRejectionFeedback(san, ctx.liveFen, message),
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
