// studentResult — ONE place a game score becomes the student's outcome
// (WO-STANDARD-01 D-13, 2026-09-22). `ReviewSummaryCard` had this derivation
// inline; the review walk's closing beat needed the same answer and a second
// copy is how a WIN once rendered "Draw" (David 2026-07-19). Zero imports.

export type StudentResult = 'win' | 'loss' | 'draw';

/**
 * The outcome from the STUDENT's seat. `result` may already be student-relative
 * ('win' | 'loss' | 'draw') or the raw PGN score ('1-0' | '0-1' | '1/2-1/2' /
 * '½-½'); the seat is needed only for the raw form. Anything unrecognised is a
 * draw — never a claimed win.
 */
export function relativeResult(result: string, playerColor: 'white' | 'black'): StudentResult {
  if (result === 'win' || result === 'loss' || result === 'draw') return result;
  if (result === '1-0' || result === '0-1') {
    return (result === '1-0') === (playerColor === 'white') ? 'win' : 'loss';
  }
  return 'draw';
}

export const RESULT_LABEL: Record<StudentResult, string> = { win: 'Victory', loss: 'Defeat', draw: 'Draw' };
