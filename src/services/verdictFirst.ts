// ON A MISTAKE TURN THE VERDICT SPEAKS FIRST (OS-18; Smith-Morra replay
// 2026-10-20, move 14: "Rd5 was a mistake…" was built at +6.7 s and heard at
// +16.9 s, queued behind the instant "Careful — your bishop on f4 is
// attacked"). The live voice is one queue in the order lines are handed to it,
// so the instant line waits for the verdict to be handed over first — unless
// it is about a mate, which nothing outranks.
import { Chess } from 'chess.js';
import { threatStakes } from './threatProof';
import { VERDICT_TURN_CP } from './learnTurnDoor';

/** The side to move (the student, after the reply) mates in one. */
function mateInOne(fen: string): boolean {
  try { return new Chess(fen).moves().some((m) => m.endsWith('#')); } catch { return false; }
}

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
  if (mateInOne(input.fenAfterReply)) return false;
  return input.moveCostCp !== null ? input.moveCostCp >= VERDICT_TURN_CP : input.verdictUrgent;
}

/** Past this, counted from the move, the next board is read anyway: a stalled
 *  verdict must never cost the student the rest of the turn. */
export const NEXT_BOARD_HOLD_MS = 6000;

/** THE NEXT BOARD IS READ ONCE THE VERDICT IS ON THE AIR (OS-18 replay
 *  2026-10-20, 14.Rd5: the verdict was handed to the voice at +4.7 s and was
 *  heard at +9.2 s; in between, the next board's reads — position facts, the
 *  plan choice, the tactical read, ~3 s of synchronous work — held the main
 *  thread, and every step the voice takes to reach the speaker waited behind
 *  them). Those reads feed the late wave, which is spoken after the verdict
 *  anyway, so on a turn whose verdict is coming they start once it is playing.
 *  Resolves at once when the move cannot be a mistake, when its price comes in
 *  under the bar, once the verdict is handed over and the voice is playing, or
 *  at the hold. */
export function nextBoardGate(input: {
  verdictUrgent: boolean;
  price: Promise<number | null>;
  /** Resolves when the verdict pass has handed its verdict to the voice (or
   *  found none). */
  verdictHeard: Promise<void>;
  untilOnAir: (maxWaitMs: number) => Promise<void>;
  holdMs?: number;
}): Promise<void> {
  if (!input.verdictUrgent) return Promise.resolve();
  const never = new Promise<void>(() => {});
  const cheap = input.price.then((c) => (c !== null && c < VERDICT_TURN_CP ? undefined : never), () => never);
  const aired = input.verdictHeard.then(() => input.untilOnAir(VERDICT_HOLD_MS));
  const hold = new Promise<void>((r) => { setTimeout(r, input.holdMs ?? NEXT_BOARD_HOLD_MS); });
  return Promise.race([cheap, aired, hold]);
}

/** THE REPLY WAITS FOR THE REASON — FOR AT MOST THE CEILING, COUNTED FROM THE
 *  MOVE (David 2026-10-17, "Delay the computer move obviously"; OS-18). The
 *  reason's reads warm DURING the think pad, so the reply lands at the later of
 *  the pad and the reason, never past the ceiling. The pad used to run first
 *  and the ceiling start after it, so a reply could land pad + ceiling after
 *  the move — 4.9 s at 14.Rd5 — and the verdict, which names the reply, waited
 *  for it. */
export function replyWait(input: {
  /** When the student's move landed (`Date.now()` clock). */
  startedAt: number;
  minThinkMs: number;
  reason: Promise<unknown>;
  ceilingMs: number;
  now?: () => number;
}): Promise<void> {
  const now = input.now ?? Date.now;
  const left = (ms: number): number => Math.max(0, ms - (now() - input.startedAt));
  const pad = new Promise<void>((r) => { setTimeout(r, left(input.minThinkMs)); });
  const reason = Promise.race([
    input.reason.then(() => undefined, () => undefined),
    new Promise<void>((r) => { setTimeout(r, left(input.ceilingMs)); }),
  ]);
  return Promise.all([pad, reason]).then(() => undefined);
}
