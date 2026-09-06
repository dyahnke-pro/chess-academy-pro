/**
 * freeTierStore — synchronous runtime mirror of the Dexie `freeTier` ledger.
 * --------------------------------------------------------------------------
 * The access gate and the puzzle meter need to read free-tier spend
 * SYNCHRONOUSLY during render (allow/wall decisions can't await Dexie). This
 * Zustand store holds the current ledger row, hydrated from Dexie on boot, and
 * exposes actions that persist via `freeTierService` AND update the mirror in
 * one call. Dormant unless the paywall gate is live + user not Pro (callers
 * guard). See docs/plans/2026-07-14-freemium-soft-gate.md.
 */
import { create } from 'zustand';
import type { FreeTierRecord } from '../db/schema';
import {
  loadFreeTier,
  recordPuzzleSolved as svcRecordPuzzleSolved,
  claimFreeOpening as svcClaimFreeOpening,
  stampKidAccess as svcStampKidAccess,
  recordCoachLessonUsed as svcRecordCoachLessonUsed,
  recordCoachChatTurnUsed as svcRecordCoachChatTurnUsed,
  recordCoachSpend as svcRecordCoachSpend,
  markCoachUnlockAnnouncementSeen as svcMarkCoachUnlockAnnouncementSeen,
  type ClaimResult,
} from '../services/freeTierService';

export interface FreeTierState {
  /** Current ledger snapshot (puzzlesSolved / freeOpeningId / kidFirstAccessAt /
   *  coachLessonsUsed / coachChatTurnsUsed). */
  row: FreeTierRecord;
  /** True once the initial Dexie hydrate has completed. */
  hydrated: boolean;

  /** Load the row from Dexie into the mirror (idempotent; call on boot). */
  hydrate: () => Promise<void>;
  /** Record one solved puzzle; persists + updates the mirror. */
  recordPuzzleSolved: () => Promise<void>;
  /** Claim the one free opening; persists + updates the mirror. */
  claimFreeOpening: (openingId: string) => Promise<ClaimResult>;
  /** Stamp first kid-section access if unset; persists + updates the mirror. */
  stampKidAccess: () => Promise<void>;
  /** Record one coach lesson start; persists + updates the mirror. */
  recordCoachLessonUsed: () => Promise<void>;
  /** Record one coach chat turn; persists + updates the mirror. */
  recordCoachChatTurnUsed: () => Promise<void>;
  /** Accrue coach LLM token cost (USD) against the lifetime free budget;
   *  persists + updates the mirror so the gate re-evaluates without a reload. */
  recordCoachSpend: (costUsd: number) => Promise<void>;
  /** Mark the coach-unlock announcement seen; persists + updates the mirror. */
  markCoachUnlockSeen: () => Promise<void>;
}

const INITIAL_ROW: FreeTierRecord = {
  id: 'singleton',
  puzzlesSolved: 0,
  freeOpeningId: null,
  freeOpeningIds: [],
  earnedOpeningCredits: 0,
  kidFirstAccessAt: null,
  coachLessonsUsed: 0,
  coachChatTurnsUsed: 0,
  coachSpendUsd: 0,
  coachUnlockSeenAt: null,
  updatedAt: 0,
};

export const useFreeTierStore = create<FreeTierState>((set) => ({
  row: { ...INITIAL_ROW },
  hydrated: false,

  hydrate: async () => {
    const row = await loadFreeTier();
    set({ row, hydrated: true });
  },
  recordPuzzleSolved: async () => {
    const row = await svcRecordPuzzleSolved();
    set({ row });
  },
  claimFreeOpening: async (openingId: string) => {
    const { result, row } = await svcClaimFreeOpening(openingId);
    set({ row });
    return result;
  },
  stampKidAccess: async () => {
    const row = await svcStampKidAccess();
    set({ row });
  },
  recordCoachLessonUsed: async () => {
    const row = await svcRecordCoachLessonUsed();
    set({ row });
  },
  recordCoachChatTurnUsed: async () => {
    const row = await svcRecordCoachChatTurnUsed();
    set({ row });
  },
  recordCoachSpend: async (costUsd: number) => {
    const row = await svcRecordCoachSpend(costUsd);
    set({ row });
  },
  markCoachUnlockSeen: async () => {
    const row = await svcMarkCoachUnlockAnnouncementSeen();
    set({ row });
  },
}));

// Referral / review rewards write earned credits straight to the Dexie ledger
// (referralService), bypassing the store's own actions. Re-hydrate the mirror
// when that happens so an extra free-opening slot shows up without a reload.
if (typeof window !== 'undefined') {
  window.addEventListener('free-tier-updated', () => { void useFreeTierStore.getState().hydrate(); });
}
