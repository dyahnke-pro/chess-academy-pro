// ON A MISTAKE TURN THE VERDICT SPEAKS FIRST (OS-18; Smith-Morra replay
// 2026-10-20, move 14: "Rd5 was a mistake…" was built at +6.7 s and heard at
// +16.9 s, queued behind the instant "Careful — your bishop on f4 is
// attacked"). The live voice is one queue in the order lines are handed to it,
// so the instant line waits for the verdict to be handed over first — unless
// it is about a mate, which nothing outranks.
import { threatStakes } from './threatProof';
import { VERDICT_TURN_CP } from './learnTurnDoor';

/** Past this the instant line speaks anyway: a slow engine must never cost the
 *  student the warning. */
export const VERDICT_HOLD_MS = 4000;

export function instantWaitsForVerdict(input: {
  /** The move's price when the search has answered, else null. */
  moveCostCp: number | null;
  /** The move may have cost something (no cheap grade from the pre-move fan). */
  verdictUrgent: boolean;
  /** The board the instant line is about (after their reply), student to move. */
  fenAfterReply: string;
  student: 'w' | 'b';
  /** A forced mate leads the instant wave, or the reply mated. */
  mateTurn: boolean;
}): boolean {
  if (input.mateTurn) return false;
  if (threatStakes(input.fenAfterReply, input.student, [])?.mate) return false;
  return input.moveCostCp !== null ? input.moveCostCp >= VERDICT_TURN_CP : input.verdictUrgent;
}
