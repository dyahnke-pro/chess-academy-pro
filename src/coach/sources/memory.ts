/**
 * Memory source — read-only snapshot of `useCoachMemoryStore` shaped
 * for the envelope.
 *
 * COACH-BRAIN-00 specifies Supabase as the long-term store and
 * "in-memory cache for offline/retry". Today, UNIFY-01's
 * `useCoachMemoryStore` is the in-memory cache (Zustand) with Dexie
 * persistence. Supabase sync is intentionally PUNTED in this WO
 * (Punt #1 in the PR description) — the migration `0003_coach_memory`
 * lands so the table exists, but runtime reads/writes still go
 * through the store and Dexie. A follow-up WO wires real-time
 * Supabase sync onto the same surface without changing this
 * function's signature.
 *
 * Writers MUST go through this source — never call
 * `useCoachMemoryStore` setters directly from a brain tool. This
 * keeps audit emission, RLS, and future Supabase mirroring honest.
 */
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import type { CoachMemorySnapshot } from '../types';
import type {
  CoachMessage,
  HintRequestRecord,
  IntendedOpening,
} from '../../stores/coachMemoryStore';

/** Read a frozen snapshot of coach memory. The envelope assembler
 *  embeds this directly. */
export function readMemorySnapshot(): CoachMemorySnapshot {
  const state = useCoachMemoryStore.getState();
  return {
    intendedOpening: state.intendedOpening,
    conversationHistory: state.conversationHistory,
    preferences: state.preferences,
    hintRequests: state.hintRequests,
    blunderPatterns: state.blunderPatterns,
    growthMap: state.growthMap,
    gameHistory: state.gameHistory,
  };
}

// ─── Writers (used by cerebrum tools only) ───────────────────────────────────

export function memorySetIntendedOpening(input: {
  name: string;
  color: 'white' | 'black';
  capturedFromSurface: string;
}): IntendedOpening {
  useCoachMemoryStore.getState().setIntendedOpening(input);
  // Re-read to return the persisted record (with `setAt` populated).
  const stored = useCoachMemoryStore.getState().intendedOpening;
  if (!stored) {
    throw new Error('memorySetIntendedOpening: write succeeded but read returned null');
  }
  return stored;
}

export function memorySetSavedPosition(input: { fen: string; label?: string }): void {
  useCoachMemoryStore.getState().setSavedPosition(input);
}

export function memoryClearSavedPosition(): void {
  useCoachMemoryStore.getState().clearSavedPosition();
}

export function memoryReadSavedPosition(): { fen: string; label: string | null; savedAt: number; source: 'explicit' | 'auto' } | null {
  const state = useCoachMemoryStore.getState();
  if (state.savedPosition) {
    return { ...state.savedPosition, source: 'explicit' };
  }
  if (state.autoSavedPosition) {
    return { ...state.autoSavedPosition, source: 'auto' };
  }
  return null;
}

export function memorySetAutoSavedPosition(fen: string): void {
  useCoachMemoryStore.getState().setAutoSavedPosition(fen);
}

export function memoryClearIntendedOpening(reason: 'user-said-forget' | 'user-said-play-anything' | 'intent-left-book'): void {
  useCoachMemoryStore.getState().clearIntendedOpening(reason);
}

export function memoryRecordHintRequest(input: {
  gameId: string;
  moveNumber: number;
  ply: number;
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  tier: 1 | 2 | 3;
}): { id: string; record: HintRequestRecord } {
  const id = useCoachMemoryStore.getState().recordHintRequest(input);
  const record = useCoachMemoryStore.getState().hintRequests.find((r) => r.id === id);
  if (!record) {
    throw new Error('memoryRecordHintRequest: write succeeded but read returned null');
  }
  return { id, record };
}

export function memoryAppendConversationMessage(input: Omit<CoachMessage, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: number;
}): string {
  return useCoachMemoryStore.getState().appendConversationMessage(input);
}

/** Clear scope used by the `clear_memory` cerebrum tool. */
export type ClearMemoryScope = 'intended-opening' | 'conversation' | 'all';

export function memoryClear(scope: ClearMemoryScope, reason = 'user-said-forget' as const): void {
  const state = useCoachMemoryStore.getState();
  if (scope === 'intended-opening' || scope === 'all') {
    if (state.intendedOpening) {
      state.clearIntendedOpening(reason);
    }
  }
  if (scope === 'conversation' || scope === 'all') {
    // Conversation history doesn't have a dedicated clear action; we
    // overwrite by appending a sentinel and leaving the store to
    // garbage-collect on the 200-entry cap. A dedicated clear is a
    // follow-up. For now this is a soft-clear (history persists but
    // every new write trims older entries on the existing FIFO).
    // The audit log captures the intent so the action is observable.
    useCoachMemoryStore.getState().appendConversationMessage({
      surface: 'live-coach',
      role: 'coach',
      text: '[memory cleared by user request]',
      trigger: null,
    });
  }
}
