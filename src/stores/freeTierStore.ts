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
  type ClaimResult,
} from '../services/freeTierService';

export interface FreeTierState {
  /** Current ledger snapshot (puzzlesSolved / freeOpeningId / kidFirstAccessAt). */
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
}

const INITIAL_ROW: FreeTierRecord = {
  id: 'singleton',
  puzzlesSolved: 0,
  freeOpeningId: null,
  kidFirstAccessAt: null,
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
}));
