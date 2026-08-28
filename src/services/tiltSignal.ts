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

// A game-level RAGE-QUIT read (colour-free): a coach game that ended in a
// resignation / abandonment in very few moves is disengagement, whoever
// resigned. A cluster of them is a strong tilt signal the session read misses.
const BAIL_MAX_PLIES = 16;
interface GameLike { pgn?: string; termination?: string; source?: string }

function plyCount(pgn: string): number {
  // Strip move numbers + result, count SAN tokens. Cheap and good enough.
  return (pgn || '')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => /[a-hKQRBNO]/.test(t)).length;
}

/** Tilt from recent coach games (newest first) — a short-abandon streak. Pure. */
export function detectGameTilt(recentGamesNewestFirst: GameLike[]): TiltVerdict {
  const games = recentGamesNewestFirst.filter((g) => (g.source ?? 'coach') === 'coach').slice(0, 6);
  const bails = games.filter((g) => /resign|abandon|abort/i.test(g.termination ?? '') && plyCount(g.pgn ?? '') < BAIL_MAX_PLIES);
  if (bails.length >= 2) return { level: 'strong', reason: 'a couple of recent games ended in a quick resignation' };
  if (bails.length === 1 && games.length >= 1 && /abandon|abort/i.test(games[0].termination ?? '') && plyCount(games[0].pgn ?? '') < BAIL_MAX_PLIES) {
    return { level: 'mild', reason: 'the last game was cut short' };
  }
  return NONE;
}

const RANK: Record<TiltVerdict['level'], number> = { none: 0, mild: 1, strong: 2 };

/**
 * Read the last few training sessions AND recent coach games from Dexie and
 * return the strongest tilt verdict. Degrades to `none` on any read error (the
 * tone hint is a bonus, never a blocker).
 */
export async function getRecentTiltVerdict(): Promise<TiltVerdict> {
  try {
    const [sessions, games] = await Promise.all([
      db.sessions.orderBy('date').reverse().limit(4).toArray(),
      db.games.orderBy('date').reverse().limit(6).toArray().catch(() => []),
    ]);
    const s = detectTilt(sessions);
    const g = detectGameTilt(games as GameLike[]);
    return RANK[g.level] > RANK[s.level] ? g : s;
  } catch {
    return NONE;
  }
}
