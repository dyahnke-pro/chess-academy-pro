/**
 * Does a narrated ply hand the MOVER's action to the wrong seat?
 *
 * 🔴 WHY THIS IS A MODULE AND NOT FOUR LINES IN THE AUDIT. It was four lines in
 * the audit, it took THREE cuts to get right, and TWO OF THOSE CUTS WERE
 * SILENTLY INERT — they reported themselves applied and changed nothing:
 *
 *   Cut 1  built the regex by interpolating a string, so the escaping came out
 *          as a LITERAL backslash and the pattern never matched what it read as.
 *   Cut 2  used an optional group, which BACKTRACKS TO EMPTY: the lookahead
 *          rejects at "wanted", the engine retries at "both", and it fires
 *          anyway — the bug it was written to fix, surviving the fix.
 *   Cut 3  strips the hedge FIRST and then tests. A shape you can read beats
 *          one you have to simulate in your head.
 *
 * After all that it was protected by NOTHING: the predicate lived inside a
 * 1,200-line prod audit, so the only way to exercise it was a full browser run
 * against a live deploy. "12/12 both directions" was a one-off hand check that
 * left no gate behind — a claim, not a gate, which is the failure this repo
 * keeps paying for. Lifting it out makes it a pure function the suite can hold.
 *
 * ── WHAT IT IS ACTUALLY CHECKING ────────────────────────────────────────────
 * The locked seat rule (2026-08-28): the student is "you/your", the opponent is
 * "they/their". So on an OPPONENT ply the narration must not open by making
 * "you" the ACTOR — "you take on e5" on a ply the opponent moved hands the
 * student the opponent's move.
 *
 * It must NOT fire on the many legitimate openings that address the student
 * without claiming they moved: state ("you're better"), possession ("you have
 * the pair"), perception ("you saw it coming"), or the plan-race prose that
 * caused the false red — "You both wanted the open e-file, but only their rook
 * could take it — it was theirs first." That sentence is CORRECT: it addresses
 * the student, describes both sides, and attributes the file to the opponent.
 *
 * 🚨 IT IS A HEURISTIC AND IT ERRS TOWARD FIRING, ON PURPOSE. A false red costs
 * one investigation; a false green lets the locked seat rule rot silently. Do
 * not "tune" it quiet — add the verb, or the hedge, and add a case below.
 */

/** Verbs that describe STATE / possession / perception rather than a move. */
const NON_ACTION = "'re|'ve|'ll|'d|are|was|were|have|had|has|need|want|know|knew|see|saw|feel|felt|get|got|keep|kept|hold|held|sit|sat|stand|stood|remain|stay";

/** Quantifiers and adverbs that may sit between "you" and its verb. */
const HEDGE = /^(you)\s+(?:both|also|still|already|now|never|only|again|clearly)\s+/i;

const SEAT_RE = new RegExp(`^you\\s+(?!(?:${NON_ACTION})(?:s|d|ed|ing)?\\b)[a-z]`, 'i');

/**
 * @param {string} head        the narration's opening clause
 * @param {boolean} studentPly did the STUDENT make this move?
 * @returns {{ fails: boolean, reason: string }}
 */
export function seatReattributes(head, studentPly) {
  const text = String(head ?? '');
  if (studentPly) {
    // The mirror: the student moved, so the narration must not open by giving
    // the move to the opponent.
    return /^(your opponent|they )/i.test(text)
      ? { fails: true, reason: 'student ply narrated as the opponent acting' }
      : { fails: false, reason: '' };
  }
  // Strip the hedge BEFORE testing — never as an optional group inside the
  // pattern, which backtracks to empty and re-admits the bug (cut 2).
  const deHedged = text.replace(HEDGE, '$1 ');
  return SEAT_RE.test(deHedged)
    ? { fails: true, reason: 'opponent ply narrated as the student acting' }
    : { fails: false, reason: '' };
}
