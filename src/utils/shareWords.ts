// HOW OFTEN, SAID THE WAY A COACH SAYS IT (David 2026-10-06: "statistics where
// a reason should be"). A share of games becomes a frequency word; the number
// itself is never spoken. One source, so every surface draws the same edges.

/** A share (0–100) as an adverb: "almost always" / "usually" / "often" / "sometimes". */
export function shareAdverb(pct: number): string {
  if (pct >= 70) return 'almost always';
  if (pct >= 45) return 'usually';
  if (pct >= 25) return 'often';
  return 'sometimes';
}

/** The MOST-played move, said by how firmly masters agree on it. A leader at 30%
 *  is not played "sometimes" — it heads a split field — so below "usually" the
 *  words say that instead. Shared by every surface that names the book move. */
export function topMoveShare(pct: number): string {
  if (pct >= 45) return `masters ${shareAdverb(pct)} play it`;
  return 'the most common choice, though masters are split here';
}
