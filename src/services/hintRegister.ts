// How obvious the coach's hints should be, and how often they should come.
//
// David 2026-08-09: "it's not a hint button, but the coach narrations that act
// like hints throughout the game. Stronger player more subtle and less often
// hints. Weaker player much more obvious and more often." And then the dial
// itself: "We can use the amount of times the user finds the right move and
// adjust the hint accordingly."
//
// That second sentence is the design. Rating is a stale prior — typed in once,
// often flattering, and silent about whether the person is warmed up, tired, or
// out of their depth in THIS position. Whether they found the last six moves is
// a live read on the player actually sitting there. So rating opens the dial
// (it is all we know at move one) and the found/missed tally moves it.
//
// Nothing new is computed for this. `isNearBest(cpLoss)` already runs on every
// player move for the slip detector; the tally is that boolean, remembered.
//
// The register does NOT change what is true — the fact comes from the board
// either way (G0). It changes how far the sentence sits from the answer:
//
//   subtle   "e5 is the square this game turns on."
//   moderate "My knight is heading for e5."
//   obvious  "My knight is coming to e5 and nothing of yours is watching it."
//
// Same computed fact, three distances.
import { isNearBest } from './slipDetector';

export type HintRegister = 'obvious' | 'moderate' | 'subtle';

export interface HintDial {
  register: HintRegister;
  /** The most recent attempts, newest last. Bounded to WINDOW. */
  recent: boolean[];
}

/** How many recent moves the tally reads.
 *
 *  Short on purpose. A whole game's average tracks who the student IS; a
 *  handful of moves tracks how they are DOING, which is the thing that should
 *  move the register. Six is about two of the student's own moves per minute of
 *  play — long enough not to swing on one blunder, short enough to notice a
 *  collapse in the middlegame. */
export const WINDOW = 6;

/** Below this many attempts the tally has not earned an opinion, and the
 *  rating-seeded opening register stands. */
const MIN_ATTEMPTS = 3;

/** The dead band. Crossing OUT of the current register needs a clear result;
 *  anything between these two rates leaves it alone.
 *
 *  This is the hysteresis, and it is not decoration: without it the register
 *  flips on nearly every move around the boundary, and a coach that alternates
 *  between cryptic and blunt does not read as adaptive — it reads as broken. */
const RATE_TO_RISE = 0.75; // finding almost everything → back off
const RATE_TO_FALL = 0.35; // missing most of it → spell it out

/** Where the dial starts, from the only thing known at move one.
 *
 *  The bands match `slipWarrantsInterjection` exactly (beginner < 1000,
 *  intermediate 1000–2000, advanced > 2000) — one rating taxonomy in the app,
 *  not two that drift apart. */
export function openingRegister(rating: number | undefined | null): HintRegister {
  const r = rating ?? 1200;
  if (r > 2000) return 'subtle';
  if (r >= 1000) return 'moderate';
  return 'obvious';
}

export function startDial(rating: number | undefined | null): HintDial {
  return { register: openingRegister(rating), recent: [] };
}

const MORE_SUBTLE: Record<HintRegister, HintRegister> = {
  obvious: 'moderate',
  moderate: 'subtle',
  subtle: 'subtle',
};

const MORE_OBVIOUS: Record<HintRegister, HintRegister> = {
  subtle: 'moderate',
  moderate: 'obvious',
  obvious: 'obvious',
};

/**
 * Record one player move and return the dial as it now stands.
 *
 * `cpLoss` is the same number the slip detector already has, so the caller
 * hands over what it computed rather than triggering a second engine read.
 *
 * One step at a time, deliberately: a student who strings together three good
 * moves earns one notch of subtlety, not a jump from spelled-out to cryptic.
 */
export function recordAttempt(dial: HintDial, cpLoss: number): HintDial {
  const recent = [...dial.recent, isNearBest(cpLoss)].slice(-WINDOW);
  if (recent.length < MIN_ATTEMPTS) return { register: dial.register, recent };

  const found = recent.filter(Boolean).length;
  const rate = found / recent.length;
  if (rate >= RATE_TO_RISE) return { register: MORE_SUBTLE[dial.register], recent };
  if (rate <= RATE_TO_FALL) return { register: MORE_OBVIOUS[dial.register], recent };
  return { register: dial.register, recent };
}

/**
 * How many plies must pass before another hint is worth speaking.
 *
 * The frequency half of David's rule. Note this is a SEPARATE dial from
 * `slipWarrantsInterjection`, and conflating the two would invert it: that gate
 * is about interrupting the student's own mistakes, where a beginner needs LESS
 * (they blunder constantly and stopping every time is nagging). This is about
 * volunteering teaching, where a beginner needs MORE.
 */
export function hintPlyGap(register: HintRegister): number {
  switch (register) {
    case 'obvious': return 2;
    case 'moderate': return 4;
    case 'subtle': return 8;
  }
}

/** Is a hint due at this ply? */
export function hintIsDue(register: HintRegister, ply: number, lastHintPly: number): boolean {
  return ply - lastHintPly >= hintPlyGap(register);
}

/**
 * Stretch or shrink an existing beat's cooldown by the register.
 *
 * The Learn surface already carries hand-tuned gaps per beat (think-aloud every
 * 6 plies, priority-first every 10) — the frequency dial, hardcoded at one
 * setting. Rather than replacing numbers that were tuned against real games,
 * scale them: the relative cadence between beats is preserved, the whole
 * pattern just breathes in or out with the student.
 *
 * Rounded UP so a scaled gap can never collapse to zero and turn a beat into
 * per-move chatter.
 */
export function scaleGap(baseGap: number, register: HintRegister): number {
  switch (register) {
    case 'obvious': return Math.max(1, Math.ceil(baseGap / 2));
    case 'moderate': return baseGap;
    case 'subtle': return baseGap * 2;
  }
}
