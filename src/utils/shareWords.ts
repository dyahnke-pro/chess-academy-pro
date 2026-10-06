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
