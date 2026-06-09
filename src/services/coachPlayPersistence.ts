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
import type { ChatMessage, CoachGameState } from '../types';
import type { ClockState } from './chessClock';

// v2 (WO-RESUME-01): snapshot now carries the full SAN history + the
// CoachGameState + clock so resume rebuilds a CONSISTENT game (real
// chess.js history, correct last-move highlight, intact move list) —
// the v1 FEN-only snapshot produced "ghost squares" and was never
// restored. Bumping the key cleanly ignores any stale v1 record.
const META_KEY = 'coachPlayActive.v2';
/** Separate key for the per-game chat transcript so corruption here
 *  can't break the main resume flow. Paired with META_KEY by caller
 *  (GameChatPanel wiring in CoachGamePage). */
const CHAT_META_KEY = 'coachPlayChat.v1';
/** Cap on persisted chat messages — keeps DB writes cheap even on
 *  long games where the student asks many questions. */
const CHAT_MAX_MESSAGES = 200;

/** Drop saved state older than this on load — if you haven't touched
 *  the tab in a week, you probably meant to start fresh. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CoachPlayActiveState {
  /** FEN after the most recent move. Kept for validation / a last-ditch
   *  fallback; the SAN history below is the primary restore source. */
  fen: string;
  /** Full SAN move list. Replayed on resume so chess.js rebuilds real
   *  history and the board lights the last move (no ghost squares). */
  sans: string[];
  /** Last move's squares — restores the board highlight immediately. */
  lastMove: { from: string; to: string } | null;
  /** The CoachGameState snapshot (move list + hints + takebacks +
   *  keyMoments + result) so the move-list UI + analysis resume intact. */
  gameState: CoachGameState;
  /** Remaining clock for a timed game. Null/omitted = unlimited. */
  clock: ClockState | null;
  /** Which colour the student is playing. */
  playerColor: 'white' | 'black';
  /** Difficulty level for the engine. CoachGamePage only accepts
   *  the concrete levels; 'auto' from the URL flow is normalized to
   *  'medium' before this interface sees it. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Time control id (chessClock TIME_CONTROLS). Undefined = unlimited. */
  timeControlId?: string;
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
    const record = await db.meta.get(META_KEY);
    if (!record) return null;
    const value = record.value as unknown as CoachPlayActiveState | undefined;
    // Require the SAN history (the primary restore source). A snapshot
    // without it can't rebuild a consistent game, so treat as nothing.
    if (!value || !value.fen || !Array.isArray(value.sans) || value.sans.length === 0) return null;
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
 * stale-load above. Also drops the paired chat transcript so the
 * next game starts fresh.
 */
export async function clearCoachPlayState(): Promise<void> {
  try {
    await db.table('meta').delete(META_KEY);
    await db.table('meta').delete(CHAT_META_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Persist the GameChatPanel chat transcript so it survives reload.
 * Capped at CHAT_MAX_MESSAGES (newest kept) to bound DB writes and
 * prevent runaway growth on long games. Swallows errors — if
 * IndexedDB is unavailable the transcript just won't resume.
 */
export async function saveCoachPlayChat(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages.slice(-CHAT_MAX_MESSAGES);
    await db.table('meta').put({ key: CHAT_META_KEY, value: trimmed });
  } catch {
    /* no-op */
  }
}

/**
 * Load the saved chat transcript for the active game, or [] when
 * no transcript is saved. Returns [] (not null) so callers can
 * unconditionally spread into initial state.
 */
export async function loadCoachPlayChat(): Promise<ChatMessage[]> {
  try {
    const record = await db.meta.get(CHAT_META_KEY);
    if (!record) return [];
    const value = record.value as unknown as ChatMessage[] | undefined;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
