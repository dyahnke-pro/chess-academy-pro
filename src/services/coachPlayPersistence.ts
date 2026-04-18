/**
 * coachPlayPersistence
 * --------------------
 * Resumable coach-play state.
 *
 * When the student leaves the play tab mid-game (to solve a puzzle,
 * read a walkthrough, etc.) and later taps Play, the board should pop
 * up where they left off — same position, same opponent configuration.
 *
 * We persist a small snapshot of the active game to the Dexie `meta`
 * table (IndexedDB — survives reload, app close, PWA reinstall on
 * iOS). Only one active game per profile; starting a new one
 * overwrites the snapshot; game-end clears it.
 *
 * Kept intentionally small (no commentary history, no key moments)
 * so every move can write synchronously without lag. The FEN is the
 * truth; everything else is session configuration.
 */
import { db } from '../db/schema';

const META_KEY = 'coachPlayActive.v1';

/** Drop saved state older than this on load — if you haven't touched
 *  the tab in a week, you probably meant to start fresh. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CoachPlayActiveState {
  /** FEN after the most recent move. The board resumes here. */
  fen: string;
  /** Which colour the student is playing. */
  playerColor: 'white' | 'black';
  /** Difficulty level for the engine. CoachGamePage only accepts
   *  the concrete levels; 'auto' from the URL flow is normalized to
   *  'medium' before this interface sees it. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Optional opening / subject that seeded the game ("Sicilian Najdorf"). */
  subject: string | null;
  /** Number of half-moves played so far. Lets the UI say "resume —
   *  12 moves in". */
  halfMoveCount: number;
  /** Millisecond timestamp of the last save. */
  updatedAt: number;
}

/**
 * Persist the current game state. Called on every move + on config
 * changes. Swallows errors — if IndexedDB is unavailable we simply
 * don't resume later, which is fine.
 */
export async function saveCoachPlayState(state: CoachPlayActiveState): Promise<void> {
  try {
    await db.table('meta').put({ key: META_KEY, value: state });
  } catch {
    /* IndexedDB unavailable — resume will just no-op later */
  }
}

/**
 * Load the last saved game state, or null if nothing is saved or the
 * snapshot is stale.
 */
export async function loadCoachPlayState(): Promise<CoachPlayActiveState | null> {
  try {
    const record = await db.table('meta').get(META_KEY);
    if (!record) return null;
    const value = record.value as CoachPlayActiveState | undefined;
    if (!value || !value.fen) return null;
    if (Date.now() - value.updatedAt > MAX_AGE_MS) {
      // Stale — clear so we don't keep reading it forever.
      await clearCoachPlayState();
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Drop the saved state. Called on game-over, explicit restart, or
 * stale-load above.
 */
export async function clearCoachPlayState(): Promise<void> {
  try {
    await db.table('meta').delete(META_KEY);
  } catch {
    /* no-op */
  }
}
