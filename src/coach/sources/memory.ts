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

/**
 * QUEUE A WALKTHROUGH FOR LEARN TO START ON ARRIVAL — the one hand-off.
 *
 * Two callers used to own this sentence: the `start_walkthrough_for_opening`
 * tool (when its ctx carried no host) and, separately, the actuator's
 * `start-walkthrough` fallback, which navigated to `/coach/teach?opening=` — a
 * route Learn answers with a GREETING, not a lesson. One queue, one drain
 * (`CoachTeachPage` on mount), one computed sentence the phrasing pass must
 * voice. `navigated` says whether the caller has ALREADY moved the student, so
 * the model is never told to call `navigate_to_route` for a trip in progress —
 * and never told the board is set up, because it is not.
 */
export function memoryQueueWalkthrough(input: {
  opening: string;
  variation?: string;
  orientation?: 'white' | 'black';
  pgn?: string;
  requestedFromSurface?: string | null;
  navigated: boolean;
}): { queued: true; sentence: string } {
  useCoachMemoryStore.getState().queueWalkthrough({
    opening: input.opening,
    requestedFromSurface: input.requestedFromSurface ?? null,
    ...(input.variation ? { variation: input.variation } : {}),
    ...(input.orientation ? { orientation: input.orientation } : {}),
    ...(input.pgn ? { pgn: input.pgn } : {}),
  });
  const what = input.variation ? `${input.opening}, ${input.variation}` : input.opening;
  const sentence =
    `Not started yet — this surface cannot host a walkthrough. The ${what} lesson is QUEUED and will start by itself the moment you reach Learn with Coach. `
    + (input.navigated
      ? 'You are being taken there now — do NOT call navigate_to_route again. '
      : 'Call navigate_to_route to /coach/teach now. ')
    + 'Tell the student the lesson will begin on arrival — do NOT tell them the board is already set up, because it is not.';
  return { queued: true, sentence };
}

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
