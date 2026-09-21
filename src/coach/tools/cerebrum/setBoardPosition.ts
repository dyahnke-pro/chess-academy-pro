/**
 * set_board_position — REAL (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Jumps the board to a position via the surface-supplied `onSetBoardPosition`
 * callback (which now defaults to the global hand registry, so any mounted
 * surface is reachable).
 *
 * 🔒 HOW A POSITION MAY BE NAMED — three grounded routes, and no fourth.
 *
 *   `moves`  — a real SAN line, replayed by chess.js from the start. A
 *              fabricated line names a move that is not legal in the real
 *              position, so the lie collapses on replay.
 *   `named`  — a position the APP ships (a mating pattern, an endgame lesson).
 *              The model supplies the NAME, `resolveNamedPosition` supplies the
 *              board. Language work for the model, chess work for the code.
 *   `fen`    — accepted only when THIS APP produced that position: the live
 *              board, a ply of the student's real game, a tool result, or a
 *              line code replayed. `positionProvenance` answers that.
 *
 * 🔴 WHAT WAS DELETED HERE, AND WHY IT IS DELETED RATHER THAN ANNOTATED
 * (2026-09-21, the Lake Butler rule). The raw-FEN path used to be policed by
 * two things, and G0 names both as the disease rather than the cure — "if you
 * are adding a validator … or a prompt that says 'don't hallucinate' — STOP":
 *
 *   1. A PROMPT: "Do NOT hand-write an opening FEN from memory … never one you
 *      recalled." Unenforceable. Nothing checked, or could check, whether a FEN
 *      "came from a tool result" — it was a request, and the model's compliance
 *      with it was unobservable.
 *   2. A VALIDATOR: reject any FEN whose fullmove number is ≤ 12. It measured a
 *      property of the STRING, not of its ORIGIN, so it was wrong in both
 *      directions: a hallucinated endgame ending `w - - 0 47` passed, and a
 *      REAL position on move 9 was refused. The Catalan-Na3 fantasy it was
 *      written for was an opening-phase case; the identical fabrication past
 *      move 12 was simply unguarded for the whole life of the rule.
 *
 * Neither is replaced by a better gate. The question was made ANSWERABLE
 * instead: code records the positions it produced, and a FEN the app never
 * computed is not in the set — not judged fake, simply absent. That is the
 * difference G0 draws between watching for a wrong answer and making it
 * impossible to express.
 */
import { Chess } from 'chess.js';
import type { Tool, ToolExecutionContext, ToolExecutionResult } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';
import { provenanceOf, rememberComputedPosition, rememberedCount } from '../../../services/positionProvenance';
import { resolveNamedPosition, namedPositionNames } from '../../../services/namedPosition';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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
    // No board to set — REPORT FAILURE, never synthetic success (David
    // 2026-09-08: "it said done, but we were still on the home screen"). With
    // the global actuator defaulted into the tool context this is only reached
    // when the board genuinely can't be set, and the coach must NOT claim it did.
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'setBoardPositionTool.execute',
      summary: `set_board_position FAILED (no board to set)`,
    });
    return { ok: false, error: 'cannot set the board here — no board is available. Do not tell the user the position is set.' };
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
    "Pass `moves` — the real SAN sequence (e.g. \"d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Na3\") — for an opening, a line or a maneuver. " +
    "Pass `named` — e.g. \"Lucena\", \"back-rank mate\" — for a standard position the app teaches; the app supplies the board. " +
    "Pass `fen` only to return to a position already on screen in this conversation.",
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
      named: {
        type: 'string',
        description: 'Name of a standard position the app teaches (e.g. "Lucena", "Philidor", "back-rank mate", "wrong rook pawn"). The app resolves the name to the real board.',
      },
      fen: {
        type: 'string',
        description: 'A FEN this conversation already produced — the live board, a ply of the student\'s game, or a tool result. Not for a position recalled from elsewhere; use `moves` or `named`.',
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
      // A replayed line is a position CODE built — record it, so a later
      // "put that back up" can pass the fen and be recognised.
      rememberComputedPosition(game.fen(), 'replayed-line');
      return dispatch(game.fen(), ctx, { moves: played.join(' ') });
    }

    // ── Named path: the app's own corpora supply the board. ──
    const named = typeof args.named === 'string' ? args.named.trim() : '';
    if (named) {
      const hit = resolveNamedPosition(named);
      if (!hit) {
        // Honest null over a plausible near-miss: setting the WRONG standard
        // position and narrating it confidently is the failure this replaces.
        return {
          ok: false,
          error: `no position named "${named}" ships with the app — do not substitute one from memory. `
            + `Either give the real SAN line via \`moves\`, or pick from: ${namedPositionNames().join(', ')}.`,
        };
      }
      rememberComputedPosition(hit.fen, 'app-data');
      return dispatch(hit.fen, ctx, { named: hit.name, id: hit.id, note: hit.note });
    }

    // ── Raw-FEN path: ONLY a position this app produced. ──
    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
    if (!fen) {
      return { ok: false, error: 'provide `moves` (the real SAN line), `named` (a position the app teaches), or a `fen` already seen in this conversation' };
    }
    try {
      new Chess(fen); // chess.js validates FEN on construction.
    } catch (err) {
      return { ok: false, error: `invalid FEN: ${err instanceof Error ? err.message : String(err)}` };
    }
    const origin = provenanceOf(fen);
    if (!origin) {
      // 🔒 NOT A HALLUCINATION JUDGEMENT — an absence. The app has no record of
      // ever computing this board, so there is nothing to put up. The refusal
      // names the two grounded routes AND says whether the record is simply
      // empty, because "no positions yet this turn" and "that one is not among
      // them" are different situations and blaming the wrong one wastes a turn.
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'setBoardPositionTool.execute',
        summary: `set_board_position REFUSED (no provenance) remembered=${rememberedCount()}`,
        fen,
      });
      return {
        ok: false,
        error: rememberedCount() === 0
          ? 'this app has not produced any position yet in this conversation, so that FEN cannot be one of them. '
            + 'Use `moves` (the real SAN line) or `named` (a position the app teaches).'
          : 'that position did not come from this app — it is not the live board, a ply of the student\'s game, '
            + 'a tool result, or a line replayed here. Use `moves` (the real SAN line) or `named` (a position the app teaches).',
      };
    }
    return dispatch(fen, ctx, { origin });
  },
};
