/**
 * coachIntentRouter — Layer 1 of operator-mode foundation
 * (WO-COACH-OPERATOR-FOUNDATION-01).
 *
 * Purpose: when the user issues a high-confidence command in chat,
 * pattern-match it BEFORE calling the LLM and return a direct tool
 * dispatch. This is the "fine motor control" layer — instant, zero
 * hallucination, zero LLM round-trip latency.
 *
 * Anything that doesn't match here falls through to the LLM as
 * normal. The LLM's identity prompt also tells it to act first, but
 * relying on prompt framing alone proved insufficient (see April 26
 * audit log — brain emitted stockfish_eval instead of play_move when
 * the student said "play knight to f3"). This router is the
 * deterministic backstop.
 *
 * Patterns are ordered by specificity. First match wins.
 *
 * Note: `coachSessionRouter.ts` (formerly named `coachIntentRouter.ts`
 * before WO-COACH-OPERATOR-FOUNDATION-01) handles a different problem:
 * post-game/drawer phrase-to-route navigation. The two routers don't
 * overlap — this one returns a tool intent; that one returns a route
 * + ack message.
 */
import { Chess } from 'chess.js';

export type RoutedIntent =
  | { kind: 'play_move'; san: string }
  | { kind: 'take_back_move'; count: number }
  | { kind: 'reset_board' }
  | { kind: 'set_board_position'; fen: string }
  | { kind: 'navigate_to_route'; route: string };

export interface IntentRouterContext {
  /** Current FEN of the live board, used for SAN validation when
   *  matching `play_move`. When omitted, the router still matches but
   *  defers legality validation to the surface callback. */
  currentFen?: string;
}

/**
 * Try to match the user's text against a known command pattern.
 * Returns a `RoutedIntent` if matched, `null` if no pattern matched.
 * The caller (coachService.ask) dispatches the matched tool directly
 * via ToolExecutionContext callbacks.
 */
export function tryRouteIntent(
  text: string,
  ctx: IntentRouterContext = {},
): RoutedIntent | null {
  const lowered = text.trim().toLowerCase();
  if (!lowered) return null;

  // Diagnostic — show every input the router sees and whether it matched.
  // Dynamic-imported so this file stays free of static appAuditor coupling.
  // Will be removed once the matching bug is diagnosed.
  void import('./appAuditor').then(({ logAppAudit }) => {
    void logAppAudit({
      kind: 'coach-intent-router-input',
      category: 'subsystem',
      source: 'coachIntentRouter.tryRouteIntent',
      summary: `text="${text.slice(0, 60)}"`,
    });
  });

  // ─── play_move ──────────────────────────────────────────────────
  // "play e4", "play knight to f3", "move bishop c4", "i'll play Nf6",
  // "make the move Nc3", "push pawn to e4", etc.
  const playMoveSan = matchPlayMove(text, ctx.currentFen);
  if (playMoveSan) {
    return { kind: 'play_move', san: playMoveSan };
  }

  // ─── take_back_move ─────────────────────────────────────────────
  // WO-CYCLE7-FOLLOWUPS — broaden the regex. The previous shape
  // `take.{0,5}back` only allowed 0-5 chars between "take" and "back",
  // which meant common phrasings the user actually says — "take your
  // move back" (11 chars), "take that back" (6 chars), "take that
  // move back" (11 chars) — all failed to match. Cycle 7 audit
  // Findings 156 + 159 caught two of these phrasings going
  // unmatched and falling through to the LLM, which then said
  // "I can't take moves back" (Finding 155) instead of dispatching
  // the take-back tool.
  // Allow up to 30 chars between "take" and "back" — covers any
  // realistic 3-4 word phrasing without false-positive matching on
  // unrelated long sentences (chess discussion rarely has both
  // "take" and "back" within 30 chars unless the user is actually
  // asking for a take-back).
  if (
    /\btake\b.{0,30}\bback\b|\b(undo|let me try (that |this )?again|go back|rewind)\b/i.test(text)
  ) {
    // "two" / "both" / "2" / "two moves" / "both moves" / "whole exchange" → count=2
    const twoBack = /\b(both|two|2|two\s+moves|both\s+moves|whole\s+exchange)\b/i.test(text);
    return { kind: 'take_back_move', count: twoBack ? 2 : 1 };
  }

  // ─── reset_board ────────────────────────────────────────────────
  // Note: GameChatPanel.tsx already runs `detectInGameChatIntent`
  // BEFORE coachService.ask — its `RESTART_RE` matches a superset of
  // these phrases and short-circuits via `onRestartGame()` before the
  // spine ever sees the text. This match is a backstop for chat
  // surfaces that don't run the in-game intercept first.
  if (
    /\b(reset|start over|new (game|board)|fresh (board|start)|from the beginning|wipe (the )?board)\b/i.test(text)
  ) {
    return { kind: 'reset_board' };
  }

  // No deterministic match — fall through to LLM.
  return null;
}

/**
 * Match a `play_move` command. Looks for explicit "play X" / "make X"
 * / "move X" / "push X" framing followed by something that resembles
 * a chess move. Validates the candidate SAN against the current FEN
 * if provided — if the move is illegal from this position, returns
 * null (let the LLM handle it; might be a question about the move,
 * not a command).
 *
 * Also handles natural-language piece names: "play knight to f3",
 * "move the bishop to c4", "play pawn to e4" → translates to SAN.
 */
function matchPlayMove(text: string, currentFen?: string): string | null {
  const VERB_RE = /\b(play|move|make|do|push)\b/i;
  if (!VERB_RE.test(text)) return null;

  // Strip everything up to and including the verb (and an optional "the").
  const afterVerb = text.replace(/^.*?\b(play|move|make|do|push)\b\s+/i, '').trim();
  if (!afterVerb) return null;

  const cleanedAfterVerb = afterVerb.replace(/^(the|my|an)\s+|^a\s+(?=[a-z])/i, '');

  // Pattern 1: bare SAN. "play Nf3", "play e4", "play O-O", "play exd5".
  const SAN_RE = /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)\b/;
  const sanMatch = cleanedAfterVerb.match(SAN_RE);
  if (sanMatch) {
    const candidate = sanMatch[1];
    if (validateSan(candidate, currentFen)) return candidate;
  }

  // Pattern 2: natural language. "knight to f3", "the bishop to c4",
  // "pawn to e4", "queen on h5".
  const NL_PIECE_RE =
    /^(?:(?:my|the)\s+)?(knight|bishop|rook|queen|king|pawn)\s+(?:to|on)\s+([a-h][1-8])\b/i;
  const nlMatch = cleanedAfterVerb.match(NL_PIECE_RE);
  if (nlMatch) {
    const piece = nlMatch[1].toLowerCase();
    const square = nlMatch[2].toLowerCase();
    const pieceLetter: Record<string, string> = {
      knight: 'N',
      bishop: 'B',
      rook: 'R',
      queen: 'Q',
      king: 'K',
      pawn: '',
    };
    const candidate = `${pieceLetter[piece] ?? ''}${square}`;
    if (validateSan(candidate, currentFen)) return candidate;
  }

  return null;
}

/**
 * Validate that a SAN move is legal from the given FEN. If no FEN is
 * provided, return true (the surface will validate at dispatch time).
 */
function validateSan(san: string, fen?: string): boolean {
  if (!fen) return true;
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return true;
  } catch {
    return false;
  }
}
