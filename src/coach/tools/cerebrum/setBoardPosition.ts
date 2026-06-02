/**
 * set_board_position — REAL (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Jumps the board to a position via the surface-supplied
 * `onSetBoardPosition` callback.
 *
 * 🔒 GROUNDING TEETH (2026-06-02 — "board reset / hallucinated position"
 * incident). The brain used to be able to type ANY legal FEN here from
 * training memory — and it did: asked "show me his setup with the knight
 * on a3", it hand-built a fantasy Catalan FEN (queen already on c4, knight
 * teleported to a3) that no real game ever reaches, then narrated an
 * invented idea over it. That fabricated board then matched no opening in
 * the DB, so the grounding pipeline injected nothing (openingName="?"),
 * and the brain free-associated further. The whole loop started with one
 * memory-recalled FEN.
 *
 * The fix: an OPENING-PHASE position MUST be expressed as the real SAN
 * line (`moves`), which chess.js replays from the start — a fantasy can't
 * survive legal-move replay, so the board is always a real, reachable
 * position that the DB can recognise and ground. A raw `fen` is accepted
 * ONLY for deep / middlegame positions (past the opening phase) that come
 * from a tool result or the user's actual game — never a recalled opening.
 */
import { Chess } from 'chess.js';
import type { Tool, ToolExecutionContext, ToolExecutionResult } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** A position with fullmove number ≤ this is "opening phase" and must be
 *  built from real `moves`, not a raw FEN. The Catalan-Na3 hallucination
 *  was at fullmove 7-10; 12 covers the opening into early middlegame. */
const OPENING_PHASE_MAX_FULLMOVE = 12;

function fullmoveOf(fen: string): number {
  const n = Number(fen.trim().split(/\s+/)[5]);
  return Number.isFinite(n) ? n : 1;
}

function tokenizeMoves(moves: unknown): string[] {
  if (Array.isArray(moves)) return moves.map((m) => String(m).trim()).filter(Boolean);
  if (typeof moves === 'string') {
    return moves
      .replace(/\d+\.(\.\.)?/g, ' ') // strip move-number prefixes ("1." / "1...")
      .split(/\s+/)
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return [];
}

async function dispatch(fen: string, ctx: ToolExecutionContext | undefined, extra?: Record<string, unknown>): Promise<ToolExecutionResult> {
  if (!ctx?.onSetBoardPosition) {
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'setBoardPositionTool.execute',
      summary: `STUB set_board_position (no onSetBoardPosition callback)`,
    });
    return { ok: true, result: { stub: true, requested: { fen, ...extra }, reason: 'no onSetBoardPosition callback on this surface' } };
  }
  try {
    const result = await Promise.resolve(ctx.onSetBoardPosition(fen));
    const ok = typeof result === 'boolean' ? result : result.ok;
    const reason = typeof result === 'object' && 'reason' in result ? result.reason : undefined;
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'setBoardPositionTool',
      summary: `set_board_position ${ok ? 'ok' : 'rejected'}`,
      details: reason ? `reason=${reason}` : undefined,
      fen,
    });
    return ok ? { ok: true, result: { fen, ...extra } } : { ok: false, error: reason ?? 'surface rejected position-set' };
  } catch (err) {
    return { ok: false, error: `onSetBoardPosition threw: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export const setBoardPositionTool: Tool = {
  name: 'set_board_position',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Jump the board to a position. REQUIRED whenever you say you'll set up a position; saying it without calling this means the position did not change. " +
    "To show an OPENING or a line/maneuver, pass `moves` — the real SAN sequence from the start (e.g. \"d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3\"); the board is built by replaying those moves, so it is guaranteed to be a real, reachable position. " +
    "Do NOT hand-write an opening FEN from memory — opening-phase raw FENs are rejected. " +
    "Pass a raw `fen` ONLY for a deep middlegame/endgame position that came from a tool result or the user's actual game, never one you recalled.",
  parameters: {
    type: 'object',
    properties: {
      moves: {
        type: 'string',
        description: 'Real SAN move sequence from the standard start (or from `fromFen`), e.g. "d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3". PREFERRED for any opening/line position — replayed via chess.js so the board is always real.',
      },
      fromFen: {
        type: 'string',
        description: 'Optional base FEN to replay `moves` from. Defaults to the standard starting position.',
      },
      fen: {
        type: 'string',
        description: 'Raw target FEN. Allowed ONLY for deep (past-opening) positions from a tool/game. An opening-phase raw FEN is rejected — use `moves` instead.',
      },
    },
    // No single param is required (moves OR fen); the execute body
    // enforces "at least one" and the grounding rules.
    required: [],
  },
  async execute(args, ctx): Promise<ToolExecutionResult> {
    // ── Grounded path: build the position by replaying real moves. ──
    const moveTokens = tokenizeMoves(args.moves);
    if (moveTokens.length > 0) {
      const base = typeof args.fromFen === 'string' && args.fromFen.trim() ? args.fromFen.trim() : STARTING_FEN;
      let game: Chess;
      try {
        game = new Chess(base);
      } catch (err) {
        return { ok: false, error: `invalid fromFen: ${err instanceof Error ? err.message : String(err)}` };
      }
      const played: string[] = [];
      for (const san of moveTokens) {
        try {
          const mv = game.move(san);
          played.push(mv.san);
        } catch {
          // The lie collapses here: a fabricated line names a move that
          // isn't legal in the real position. Surface it so the brain
          // corrects to the real line instead of inventing a board.
          return {
            ok: false,
            error: `illegal move "${san}" after ${played.join(' ') || '(start)'} — this line is not real. Give the actual SAN sequence; do not invent moves.`,
          };
        }
      }
      return dispatch(game.fen(), ctx, { moves: played.join(' ') });
    }

    // ── Raw-FEN path: deep positions only. ──
    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
    if (!fen) return { ok: false, error: 'provide `moves` (the real SAN line) for an opening position, or a deep-position `fen`' };
    try {
      new Chess(fen); // chess.js validates FEN on construction.
    } catch (err) {
      return { ok: false, error: `invalid FEN: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (fullmoveOf(fen) <= OPENING_PHASE_MAX_FULLMOVE) {
      return {
        ok: false,
        error:
          'opening-phase positions must be set via `moves` (the real SAN line from the start), not a raw FEN — ' +
          'pass moves:"d4 Nf6 c4 …" so the board is a real, reachable position. ' +
          'Raw fen is only for deep middlegame/endgame positions from a tool result or the user\'s game.',
      };
    }
    return dispatch(fen, ctx);
  },
};
