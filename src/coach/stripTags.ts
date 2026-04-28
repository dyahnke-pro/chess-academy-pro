/**
 * Coach output tag-strip utility. WO-COACH-RESILIENCE part C.
 *
 * The brain emits two kinds of inline tags that must NEVER reach the
 * user (display or TTS):
 *   - [BOARD:arrow:e2->e4]      board annotation directives
 *   - [[ACTION:play_move {san}]] tool call dispatchers
 *
 * The brain has been observed emitting BOTH `[[ACTION:...]]` (double
 * brackets, the canonical form) and `[ACTION:...]` (single brackets,
 * a regression that crept in via the operator-mode foundation work).
 * Both must strip — Audit Finding 32 from production caught
 * "[[ACTION:play_move {\"san\":\"e4\"}]] Done." being spoken aloud
 * by Polly, which is exactly the leak this defends against.
 *
 * Regex strategy: alternation with the double-bracket form FIRST so
 * input like `[[ACTION:foo]]` doesn't get half-stripped to `]`. The
 * ACTION payload uses `[\s\S]*?` (lazy, dot-all-equivalent) instead
 * of `[^\]]*` because Audit Finding 48 caught
 * `[[ACTION:stockfish_eval {"fen":"r2qk2r/p1p..."}]]` being spoken in
 * full — the FEN's `/` chars and the JSON's nested `{}` were fine,
 * but the JSON's nested `]` (in arrays / escapes) terminated the
 * `[^\]]*` match early so the closing `]]` was never consumed and
 * the whole tag fell through. Lazy `[\s\S]*?` consumes everything up
 * to the first `]]` regardless of inner brackets.
 */

/** Strip `[BOARD:...]` AND both `[[ACTION:...]]` and `[ACTION:...]`
 *  variants. */
export const COACH_OUTPUT_TAG_STRIP_RE =
  /\[BOARD:\s*(?:arrow|highlight|position|practice|clear)(?::[^\]]*)?\]|\[\[ACTION:[\s\S]*?\]\]|\[ACTION:[\s\S]*?\]/gi;

export function stripCoachOutputTags(text: string): string {
  return text.replace(COACH_OUTPUT_TAG_STRIP_RE, '');
}
