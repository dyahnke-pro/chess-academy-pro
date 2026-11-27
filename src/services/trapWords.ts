// THE ONE TRAP WORDING (David 2026-11-25). The word "trap" is the app's name
// for something the OPPONENT walks into and the student punishes. The
// student's own slip is never a trap: it reads "Watch out" (a pitfall) or "a
// known mistake". Every function that picks the word takes the SEAT of who
// plays the slip, REQUIRED — a caller that forgets who slipped does not compile,
// which is how "a known trap" was once said of the student's own move.
import type { SlipKind } from './trapComputer';
import type { FactSeat } from './coachFact';

/** "trap" only when the opponent slips into one; every other case is a mistake. */
export function slipNoun(kind: SlipKind, slipBy: FactSeat): 'trap' | 'mistake' {
  return kind === 'trap' && slipBy === 'opponent' ? 'trap' : 'mistake';
}

/** "a known trap" / "a known mistake", as the lead of a sentence about the slip. */
export function knownLead(kind: SlipKind, slipBy: FactSeat): string {
  return `a known ${slipNoun(kind, slipBy)}`;
}

/** The club-level callout line: "That's a known trap at club level. ". */
export function clubLore(kind: SlipKind, slipBy: FactSeat): string {
  return `That's ${knownLead(kind, slipBy)} at club level. `;
}

/** The chip on a reply or subline: a trap for them, a known mistake, or the
 *  student's own pitfall ("Watch out"). */
export function slipChip(kind: SlipKind, slipBy: FactSeat): string {
  if (slipBy === 'student') return 'Watch out';
  return kind === 'trap' ? 'A trap for them' : 'A known mistake';
}

/** The heading over a list of slips. */
export function slipHeading(slipBy: FactSeat, count: number): string {
  if (slipBy === 'student') return 'Watch out';
  return count === 1 ? 'Their known mistake' : 'Their known mistakes';
}
