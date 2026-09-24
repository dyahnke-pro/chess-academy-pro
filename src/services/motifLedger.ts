// motifLedger — TRANSFER inside one game (WO-TEACH-02 S6, David 2026-09-24).
//
// A strong coach links the idea on the board to the last time it appeared:
// "same idea as move 12". The ledger records, per game, the MOVE NUMBER a
// tactic motif was first taught; a later appearance of the same motif carries
// the reference. Keyed on the detector's own type (never scraped from prose),
// recorded only where the caller has decided the line is SPOKEN. A leaf: both
// surfaces own their ledger (review per walk, Learn per game in learnMemory).

import { rotateStem } from '../utils/rotateStem';

/** " Same idea as move N." when this motif was taught at an EARLIER move this
 *  game, else ''. */
export function transferClause(motif: string, moveNumber: number, ledger: ReadonlyMap<string, number>): string {
  const first = ledger.get(motif);
  if (first === undefined || first >= moveNumber) return '';
  // Rotated on the move number (stable, resume-safe); the move it refers
  // back to never varies.
  return rotateStem([
    ` Same idea as move ${first}.`,
    ` You saw this same idea on move ${first}.`,
    ` It's the idea from move ${first} again.`,
  ], moveNumber);
}

/** Record the first move a motif was taught. Later calls keep the first. */
export function recordMotif(motif: string, moveNumber: number, ledger: Map<string, number>): void {
  if (!ledger.has(motif)) ledger.set(motif, moveNumber);
}
