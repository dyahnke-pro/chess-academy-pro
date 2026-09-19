/**
 * rotateStem — ONE way to vary a phrasing, and it is not a roll.
 *
 * CLAUDE.md's three tiers: FACTS are deterministic, THE OPPONENT'S MOVES are
 * genuinely random on purpose, and PHRASING is "varied, but ROTATED, not
 * rolled — keyed on something stable (ply, occurrence count, a hash), so it is
 * resume-safe and testable. Never `Math.random`."
 *
 * `Math.random` in a stem list breaks all three properties at once:
 *  - NOT RESUME-SAFE: reopening a review re-rolls every line, so the student
 *    who replays a moment hears a different coach say it.
 *  - NOT TESTABLE: an audit cannot assert what was said, only that something
 *    was, which is how a phrasing regression hides behind a green run.
 *  - NOT EVEN VARIED where it matters: a roll repeats by chance, and the
 *    complaint that opened this (#51, a stem firing 3x in one 5-ply run) is
 *    exactly what a roll does and a rotation cannot.
 *
 * The idiom is `methodBeat`'s, lifted here so there is one copy rather than a
 * fourth. The KEY is the caller's decision and is REQUIRED: it must be
 * something stable about the MOMENT — the ply, a move index, an occurrence
 * count — never a counter that resets, and never a clock.
 */
export function rotateStem(variants: readonly string[], key: number): string {
  if (variants.length === 0) return '';
  // `Math.abs` before the modulo: a negative key (a ply offset, a delta) would
  // otherwise index out of the array and yield undefined.
  return variants[Math.abs(Math.trunc(key)) % variants.length];
}

/**
 * A rotation KEY from a stable STRING — a FEN, an opening id, a puzzle id.
 *
 * `rotateStem` needs something stable about the MOMENT, and plenty of callers
 * have exactly one such thing and it is not a number. A FEN is the strongest
 * key there is: the same position always draws the same stem, so reopening a
 * puzzle or a review replays the coach word for word (resume-safe), while two
 * different positions draw independently (varied). That is the whole contract
 * `Math.random` fails.
 *
 * FNV-1a, 32-bit, `>>> 0` to stay unsigned. It lives HERE rather than beside
 * each caller because two private `simpleHash` copies already exist in this
 * codebase for cache keys, and a third hand-rolled one is how a duplicated
 * idiom starts drifting (the duplicated-constant rule).
 */
export function stemKeyOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
