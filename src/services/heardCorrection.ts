// heardCorrection — THE DEEPER READ CORRECTS WHAT WAS HEARD (David
// 2026-10-13): the grade heard live against the review's deeper grade. Moved
// out of reviewFullData so the one registry reads it.
import type { HeardVerdict } from '../types';

const FAULT_LABELS = new Set(['inaccuracy', 'mistake', 'blunder']);
const HEARD_WORDS: Record<HeardVerdict, string> = {
  fine: 'fine', inaccuracy: 'an inaccuracy', mistake: 'a mistake', blunder: 'a blunder',
};
/** What to say when the deeper read grades a move differently from the grade
 *  the student heard live, or null when they agree. `ridesVerdict` = the move
 *  is still a fault, so the correction joins its verdict sentence. */
export function correctionAgainstHeard(
  heard: HeardVerdict,
  classification: string | null,
  san: string,
): { text: string; ridesVerdict: boolean } | null {
  const c = (classification ?? '').toLowerCase();
  const now: HeardVerdict = FAULT_LABELS.has(c) ? (c as HeardVerdict) : 'fine';
  if (now === heard) return null;
  return now === 'fine'
    ? { text: `During the game your ${san} was called ${HEARD_WORDS[heard]} — the deeper read says it was fine.`, ridesVerdict: false }
    : { text: `During the game it was called ${HEARD_WORDS[heard]}. The deeper read says it was ${HEARD_WORDS[now]}.`, ridesVerdict: true };
}
