/**
 * THE piece values — one home for two DIFFERENT questions that kept getting
 * the same name.
 *
 * 🔴 MEASURED 2026-09-21: 53 private tables across `src/`, every one of them a
 * local `const`, and NO canonical export anywhere. That is the duplicated
 * constant the rot rule names — except worse, because the copies do not merely
 * risk drifting. They already disagree, 26 to 29, and BOTH are right:
 *
 *   k: 0    MATERIAL — "how much is this worth to count?" A king is never
 *           won, so it contributes nothing to a material balance.
 *   k: 100  CAPTURE — "what does it cost to take this?" The king must never
 *           be capturable in a SEE/exchange search, so it is effectively
 *           infinite and 100 stands in for that.
 *
 * Reading a `k` of 0 as though it meant the capture value (or the reverse) is
 * a real bug with a real symptom: a fork gate that asks "is this target
 * winnable" gets a different answer depending on which table it happened to
 * copy. That is not hypothetical — it is why `verifyForkOnBoard` (CAPTURE) and
 * `computePlyFacts`'s inline check (MATERIAL) disagreed about whether a royal
 * fork was real, on a board measured the same day.
 *
 * So the fix is NOT to merge them into one number. It is to give each question
 * a NAME and one home, so a reader picks a semantic instead of copying digits.
 *
 * 🚨 PICKING ONE: if you are counting material on the board, or asking what a
 * capture NETS, use `MATERIAL_VALUE`. If you are running an exchange / SEE /
 * "can this be taken" search where the king appears as a participant, use
 * `CAPTURE_VALUE`. When in doubt, ask whether a KING appearing in your sum
 * should make the answer enormous (CAPTURE) or contribute nothing (MATERIAL).
 */

/** Material worth — a king counts 0, because a king is never won. */
export const MATERIAL_VALUE: Readonly<Record<string, number>> = Object.freeze({
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
});

/** Exchange/SEE worth — a king is effectively infinite (never capturable). */
export const CAPTURE_VALUE: Readonly<Record<string, number>> = Object.freeze({
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
});

/** Non-king material balance, WHITE minus BLACK, in pawns (MATERIAL semantics,
 *  king 0). The one reader of the question — three private copies of it, each
 *  with its own value table, were folded here 2026-09-29. */
export function materialBalance(fen: string): number {
  let bal = 0;
  for (const ch of fen.split(' ')[0] ?? '') {
    const v = MATERIAL_VALUE[ch.toLowerCase()];
    if (!v) continue;
    bal += ch === ch.toUpperCase() ? v : -v;
  }
  return bal;
}

/** One side's non-king material in pawns (MATERIAL semantics). Five private
 *  `material(chess, color)` sums were folded here (census 2026-10-10). */
export function sideMaterial(fen: string, color: 'w' | 'b'): number {
  let n = 0;
  for (const ch of fen.split(' ')[0] ?? '') {
    const v = MATERIAL_VALUE[ch.toLowerCase()];
    if (!v) continue;
    if ((ch === ch.toUpperCase()) === (color === 'w')) n += v;
  }
  return n;
}
