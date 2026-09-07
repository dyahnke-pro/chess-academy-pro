import { create } from 'zustand';

/**
 * coachBoardStore — the ONE current on-screen board the coach reads (David
 * 2026-09-07: "one unified coach... tied into the chat area. Anywhere a user can
 * ask about a board position this needs to be accessible to the coach").
 *
 * The coach BRAIN is already one thing (every chat routes to the same grounded
 * spine). What was missing is a single place every board surface publishes "here
 * is the position the user is looking at", so a chat panel that doesn't run its
 * own engine loop (the opening/WLPP tabs, and any future FEN-blind surface) can
 * still answer about the on-screen board. A surface PUBLISHES its live ply here;
 * a chat panel READS it and threads it into the ask's liveState.
 *
 * Transient (never persisted). A surface clears it on unmount so a stale FEN
 * cannot leak into a later ask. Surfaces that already thread their own live FEN
 * (Play, Learn) don't need this — it's the shared fallback for the ones that
 * don't.
 */
interface CoachBoardState {
  /** FEN of the board currently on screen, or null when no board is published. */
  fen: string | null;
  /** The side the student is playing here (maps "you"), when known. */
  studentColor: 'white' | 'black' | null;
  /** A label for which surface published it (debug / audit). */
  source: string | null;
  /** Publish the live board FEN (the sub-player calls this each ply). */
  setFen: (fen: string | null, source?: string) => void;
  /** The student's side + which surface — set once by the host surface. */
  setContext: (input: { studentColor?: 'white' | 'black' | null; source?: string }) => void;
  clear: () => void;
}

export const useCoachBoardStore = create<CoachBoardState>((set) => ({
  fen: null,
  studentColor: null,
  source: null,
  setFen: (fen, source) => set(source ? { fen, source } : { fen }),
  setContext: ({ studentColor = null, source = null }) => set({ studentColor, source }),
  clear: () => set({ fen: null, studentColor: null, source: null }),
}));
