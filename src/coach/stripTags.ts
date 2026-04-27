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
 * input like `[[ACTION:foo]]` doesn't get half-stripped to `]`.
 */

/** Strip `[BOARD:...]` AND both `[[ACTION:...]]` and `[ACTION:...]`
 *  variants. */
export const COACH_OUTPUT_TAG_STRIP_RE =
  /\[BOARD:\s*(?:arrow|highlight|position|practice|clear)(?::[^\]]*)?\]|\[\[ACTION:[^\]]*\]\]|\[ACTION:[^\]]*\]/gi;

export function stripCoachOutputTags(text: string): string {
  return text.replace(COACH_OUTPUT_TAG_STRIP_RE, '');
}
