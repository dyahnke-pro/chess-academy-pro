// reviewWithholding — THE ONE WITHHOLDING RULE (unity U8).
//
// Review asks before it tells (SURFACE_CONTRACT.review.withholds). A move the
// student had to FIND after the opponent's slip — and did not — is a question
// the review may ask; naming it beforehand hands over the answer (52-error
// walk #29: "your answer was d4" on the opponent's blunder, a line before the
// d4 question). Every producer that names the student's reply to a slip reads
// this one predicate. A leaf: no imports, so any service can use it.

/** The student's next move was NOT the move that punishes the opponent's
 *  slip — so naming that move would hand over what they had to find.
 *  Unknown on either side → not missed (nothing to hold). */
export function advantageWasMissed(nextSan: string | null, answerSan: string | null): boolean {
  if (!nextSan || !answerSan) return false;
  const bare = (x: string): string => x.replace(/[+#!?]+$/, '');
  return bare(nextSan) !== bare(answerSan);
}
