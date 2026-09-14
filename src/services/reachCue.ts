/**
 * reachCue — turns a COMPUTED reach-ladder event (reachRating.ts) into the
 * coach's step-up / settle cue. The trigger is computed in code; the coach only
 * voices the line (G0). Up cues are LOUD and concrete (they name what changed —
 * the difficulty stepped up, a boss fell); the settle cue is GENTLE and never
 * says "you're getting worse" (David 2026-09-14).
 *
 * Voice honors the verbosity setting via voiceService.speakForced (Silent users
 * hear nothing); the VISUAL toast always shows. This module returns the text —
 * the surface decides visual vs voice. Concrete, not empty praise, so it clears
 * the Narration Voice Rules ban on "Great job!" acknowledgments.
 */
import type { ReachEvent } from './reachRating';

export type ReachCueTone = 'up' | 'down' | 'spike';

export interface ReachCue {
  /** Always-shown visual toast text. */
  visual: string;
  /** Spoken line — null ⇒ visual only (the gentle settle stays silent). */
  voice: string | null;
  tone: ReachCueTone;
}

/** A few phrasings per tone so a session doesn't repeat one line (Narration
 *  Voice Rules §9 — vary stems). Deterministic pick by a rotating index the
 *  caller supplies, so tests are stable and there's no per-render churn. */
const TIER_UP_LINES = [
  "You're solving these cleanly — let's step it up a notch.",
  'Sharp work. Bumping the difficulty up.',
  'That level is yours. Reaching higher now.',
];
const STREAK_LINES = [
  'On a roll — the puzzles climb from here.',
  "Streak's hot. Cranking the difficulty.",
];
const SPIKE_INCOMING_LINES = [
  "Boss puzzle — this one's above your level. Go find it.",
  'Step up: a stretch puzzle, harder than your usual. Take your time.',
];
const SPIKE_CLEARED_LINES = [
  'You cracked one above your level. That sticks.',
  'Boss down — that was over your head and you found it.',
];
// The settle line is soft and reassuring, never "worse". Voice stays silent by
// default (visual only) so a rough patch never gets a spoken callout.
const SETTLE_VISUAL = "Let's lock these in.";

function pick(lines: readonly string[], rotate: number): string {
  return lines[((rotate % lines.length) + lines.length) % lines.length];
}

/** Map a post-result reach event to a cue. `rotate` varies the phrasing. */
export function reachCueFor(event: ReachEvent, rotate = 0): ReachCue | null {
  switch (event.kind) {
    case 'tier-up': {
      const line = pick(TIER_UP_LINES, rotate);
      return { visual: `Level up! ${line}`, voice: line, tone: 'up' };
    }
    case 'streak': {
      const line = pick(STREAK_LINES, rotate);
      return { visual: `${event.streak} in a row!`, voice: line, tone: 'up' };
    }
    case 'spike-cleared': {
      const line = pick(SPIKE_CLEARED_LINES, rotate);
      return { visual: `Boss cleared! ${line}`, voice: line, tone: 'spike' };
    }
    case 'settle':
      // Gentle: visual only, no spoken callout.
      return { visual: SETTLE_VISUAL, voice: null, tone: 'down' };
    default:
      return null;
  }
}

/** The cue shown when a boss-spike puzzle is about to be SERVED (from
 *  nextTarget().isSpike), before the result. */
export function spikeIncomingCue(rotate = 0): ReachCue {
  const line = pick(SPIKE_INCOMING_LINES, rotate);
  return { visual: '⚔️ Boss puzzle', voice: line, tone: 'spike' };
}
