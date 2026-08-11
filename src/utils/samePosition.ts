/**
 * Is this the same POSITION — ignoring the clocks?
 *
 * 🔒 ONE OWNER, BECAUSE THE COPIES DISAGREED AND ONE OF THEM WAS WRONG. Nine
 * places in the app compared boards, each rebuilding this from scratch, and the
 * marks path did not: it compared whole FEN strings with `===`.
 *
 * That is not a nitpick, it is the missing-arrows bug. The plan's SPEECH guard
 * compared positions and passed; the plan's MARKS guard compared whole FENs and
 * failed. So the coach said "you want to walk the knight round to b3, by way of
 * d2" and the board stayed empty — measured on David's game of 2026-08-11:
 * 18 plans offered, 12 mark events, a third of them silent on the board while
 * every one of them was spoken aloud.
 *
 * A halfmove clock ticking is not the board moving. Two FENs that differ only
 * in their move counters describe the same pieces on the same squares, which is
 * the only thing any of these guards actually cares about.
 */
export function samePosition(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.split(' ').slice(0, 4).join(' ') === b.split(' ').slice(0, 4).join(' ');
}
