// tiltSignal — a CROSS-SESSION behavioral read (Phase 6, David 2026-08-26:
// "conversation + frustration ARE deliverable … the residual limit is heuristic
// ≠ empathy"). Within a session `studentStateBlock` already reads the move trend
// + chat sentiment; this spans SESSIONS — a rough day, an early bail — so the
// coach can keep it light instead of piling on corrections.
//
// It is a HEURISTIC, labelled as such (never fake empathy). It shapes the
// coach's TONE via the system prompt; it invents no chess (G0).
import { db } from '../db/schema';
import type { SessionRecord } from '../types';

export interface TiltVerdict {
  level: 'none' | 'mild' | 'strong';
  /** A behavioral note for the coach's tone — not a claim about the position. */
  reason: string;
}

const NONE: TiltVerdict = { level: 'none', reason: '' };

// A session is a "bad" one only when it has enough attempts to mean something —
// a 1-puzzle session at 0% is noise, not a slump.
const MIN_ATTEMPTS = 3;
const LOW_ACCURACY = 0.35;

/** True when the most recent session looks like an early bail (rage-quit
 *  proxy): abandoned, very short, almost nothing attempted. */
function isEarlyBail(s: SessionRecord): boolean {
  return !s.completed && s.durationMinutes <= 3 && s.puzzlesSolved <= 2;
}

/**
 * Read a tilt verdict from recent training sessions (newest first). Pure —
 * the caller supplies the window so it's unit-testable and DB-free.
 *
 * strong = an early bail on the most recent session, OR the last two real
 *          sessions both under the accuracy floor (a genuine slump).
 * mild   = one recent real session under the floor.
 */
export function detectTilt(recentSessionsNewestFirst: SessionRecord[]): TiltVerdict {
  const sessions = recentSessionsNewestFirst.slice(0, 4);
  if (sessions.length === 0) return NONE;

  if (isEarlyBail(sessions[0])) {
    return { level: 'strong', reason: 'the most recent session was an early bail (abandoned quickly)' };
  }

  const real = sessions.filter((s) => s.puzzlesSolved >= MIN_ATTEMPTS);
  const low = real.filter((s) => s.puzzleAccuracy < LOW_ACCURACY);

  // Two low sessions in a row (the two most recent real ones) = a slump.
  if (real.length >= 2 && real[0].puzzleAccuracy < LOW_ACCURACY && real[1].puzzleAccuracy < LOW_ACCURACY) {
    return { level: 'strong', reason: 'the last two sessions both went badly (low accuracy)' };
  }
  if (low.length >= 1 && real[0] && real[0].puzzleAccuracy < LOW_ACCURACY) {
    return { level: 'mild', reason: 'the most recent session was a rough one' };
  }
  return NONE;
}

/**
 * Read the last few training sessions from Dexie and return the tilt verdict.
 * Degrades to `none` on any read error (the tone hint is a bonus, never a
 * blocker).
 */
export async function getRecentTiltVerdict(): Promise<TiltVerdict> {
  try {
    const recent = await db.sessions.orderBy('date').reverse().limit(4).toArray();
    return detectTilt(recent);
  } catch {
    return NONE;
  }
}
